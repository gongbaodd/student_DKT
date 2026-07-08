from __future__ import annotations

import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import torch
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dkt_encoder import encode_interaction
from dkt_model import DKT


@dataclass
class PaddedBatch:
    inputs: torch.Tensor
    skills: torch.Tensor
    corrects: torch.Tensor
    mask: torch.Tensor
    transaction_ids: list[list[int]] | None = None


def build_user_sequences(
    data: list[tuple[int, int, int]],
    num_skills: int,
    transaction_ids: dict[tuple[int, int], int] | None = None,
) -> tuple[
    list[int],
    list[torch.Tensor],
    list[torch.Tensor],
    list[torch.Tensor],
    list[list[int]] | None,
]:
    by_user: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for user_id, skill_id, correct in data:
        by_user[user_id].append((skill_id, correct))

    user_ids: list[int] = []
    inputs_list: list[torch.Tensor] = []
    skills_list: list[torch.Tensor] = []
    corrects_list: list[torch.Tensor] = []
    txn_lists: list[list[int]] | None = [] if transaction_ids else None

    for user_id in sorted(by_user):
        user_ids.append(user_id)
        seq = by_user[user_id]
        skills_t = [skill_id for skill_id, _ in seq]
        corrects_t = [correct for _, correct in seq]
        inputs_t = [
            encode_interaction(skill_id, correct, num_skills)
            for skill_id, correct in seq
        ]
        inputs_list.append(torch.tensor(inputs_t, dtype=torch.float32))
        skills_list.append(torch.tensor(skills_t, dtype=torch.long))
        corrects_list.append(torch.tensor(corrects_t, dtype=torch.float32))
        if txn_lists is not None and transaction_ids is not None:
            txn_lists.append(
                [
                    transaction_ids[(user_id, idx)]
                    for idx in range(len(seq))
                ]
            )

    return user_ids, inputs_list, skills_list, corrects_list, txn_lists


def pad_sequences(
    inputs_list: list[torch.Tensor],
    skills_list: list[torch.Tensor],
    corrects_list: list[torch.Tensor],
    txn_lists: list[list[int]] | None = None,
) -> PaddedBatch:
    lengths = [tensor.size(0) for tensor in inputs_list]
    max_len = max(lengths)
    batch_size = len(inputs_list)
    input_dim = inputs_list[0].size(-1)

    inputs = torch.zeros(batch_size, max_len, input_dim)
    skills = torch.zeros(batch_size, max_len, dtype=torch.long)
    corrects = torch.zeros(batch_size, max_len)
    mask = torch.zeros(batch_size, max_len, dtype=torch.bool)
    padded_txns: list[list[int]] | None = [] if txn_lists is not None else None

    for i, (inp, sk, co) in enumerate(zip(inputs_list, skills_list, corrects_list, strict=True)):
        seq_len = inp.size(0)
        inputs[i, :seq_len] = inp
        skills[i, :seq_len] = sk
        corrects[i, :seq_len] = co
        mask[i, :seq_len] = True
        if padded_txns is not None and txn_lists is not None:
            txns = txn_lists[i]
            padded_txns.append(txns + [-1] * (max_len - len(txns)))

    return PaddedBatch(
        inputs=inputs,
        skills=skills,
        corrects=corrects,
        mask=mask,
        transaction_ids=padded_txns,
    )


def masked_dkt_loss(
    preds: torch.Tensor,
    skills: torch.Tensor,
    corrects: torch.Tensor,
    mask: torch.Tensor,
    *,
    pos_weight: float | None = None,
) -> torch.Tensor:
    selected = preds.gather(2, skills.unsqueeze(-1)).squeeze(-1)
    if pos_weight is None:
        return F.binary_cross_entropy(selected[mask], corrects[mask])

    weights = torch.where(
        corrects == 0,
        torch.full_like(corrects, pos_weight),
        torch.ones_like(corrects),
    )
    loss = F.binary_cross_entropy(selected, corrects, reduction="none")
    return (loss * weights * mask.float()).sum() / mask.float().sum()


def fraud_probabilities(preds: torch.Tensor, skills: torch.Tensor) -> torch.Tensor:
    legit = preds.gather(2, skills.unsqueeze(-1)).squeeze(-1)
    return 1.0 - legit


def iterate_batches(
    inputs_list: list[torch.Tensor],
    skills_list: list[torch.Tensor],
    corrects_list: list[torch.Tensor],
    batch_size: int,
    txn_lists: list[list[int]] | None = None,
):
    indices = list(range(len(inputs_list)))
    for start in range(0, len(indices), batch_size):
        batch_idx = indices[start : start + batch_size]
        batch_inputs = [inputs_list[i] for i in batch_idx]
        batch_skills = [skills_list[i] for i in batch_idx]
        batch_corrects = [corrects_list[i] for i in batch_idx]
        batch_txns = [txn_lists[i] for i in batch_idx] if txn_lists is not None else None
        yield pad_sequences(batch_inputs, batch_skills, batch_corrects, batch_txns)


def collect_predictions(
    model: DKT,
    inputs_list: list[torch.Tensor],
    skills_list: list[torch.Tensor],
    corrects_list: list[torch.Tensor],
    batch_size: int,
    txn_lists: list[list[int]] | None = None,
) -> tuple[list[float], list[int], list[int]]:
    model.eval()
    probs: list[float] = []
    labels: list[int] = []
    txns: list[int] = []

    with torch.no_grad():
        for batch in iterate_batches(
            inputs_list,
            skills_list,
            corrects_list,
            batch_size,
            txn_lists,
        ):
            preds = model(batch.inputs)
            fraud = fraud_probabilities(preds, batch.skills)
            for i in range(batch.inputs.size(0)):
                valid = batch.mask[i]
                step_probs = fraud[i][valid].tolist()
                step_labels = (1 - batch.corrects[i][valid]).long().tolist()
                probs.extend(step_probs)
                labels.extend(step_labels)
                if batch.transaction_ids is not None:
                    step_txns = [
                        txn
                        for txn, keep in zip(batch.transaction_ids[i], valid.tolist(), strict=True)
                        if keep and txn >= 0
                    ]
                    txns.extend(step_txns)

    return probs, labels, txns
