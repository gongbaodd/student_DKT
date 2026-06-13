import { configureOrtWasm, ort } from "./ortSetup";
import type { DoneHistoryEntry, ModelMetadata } from "./types";

const MODEL_URL = "/irt.onnx";
const METADATA_URL = "/model-metadata.json";

export class IrtModel {
  private session: ort.InferenceSession | null = null;
  readonly metadata: ModelMetadata;

  private constructor(metadata: ModelMetadata, session: ort.InferenceSession) {
    this.metadata = metadata;
    this.session = session;
  }

  static async load(): Promise<IrtModel> {
    configureOrtWasm();

    const [metadataResponse, session] = await Promise.all([
      fetch(METADATA_URL),
      ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ["wasm"],
      }),
    ]);

    if (!metadataResponse.ok) {
      throw new Error(`Failed to load metadata: ${metadataResponse.statusText}`);
    }

    const metadata = (await metadataResponse.json()) as ModelMetadata;
    return new IrtModel(metadata, session);
  }

  async predictStoryPoints(
    history: DoneHistoryEntry[],
    nextIssueKey: string,
  ): Promise<number> {
    if (!this.session) {
      throw new Error("Model session is not loaded");
    }

    const ticket = this.metadata.tickets[nextIssueKey];
    if (!ticket) {
      throw new Error(`Unknown issue key: ${nextIssueKey}`);
    }

    const maxHistory = this.metadata.maxHistory ?? 64;
    const recent = history.slice(-maxHistory);
    const seqLen = recent.length;
    const { maxPoints } = this.metadata;

    const componentIds = new BigInt64Array(seqLen);
    const points = new Float32Array(seqLen);

    for (let i = 0; i < seqLen; i++) {
      componentIds[i] = BigInt(recent[i].component);
      points[i] = recent[i].storyPoints / maxPoints;
    }

    const componentTensor = new ort.Tensor(
      "int64",
      componentIds,
      [1, seqLen],
    );
    const pointsTensor = new ort.Tensor("float32", points, [1, seqLen]);
    const nextTicketTensor = new ort.Tensor(
      "int64",
      BigInt64Array.from([BigInt(ticket.index)]),
      [1],
    );

    const output = await this.session.run({
      component_ids: componentTensor,
      points: pointsTensor,
      next_ticket: nextTicketTensor,
    });

    const raw = (output.prediction.data as Float32Array)[0];
    return Math.max(1, Math.round(raw));
  }
}
