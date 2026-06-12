import { encodeInteraction } from "./encoder";
import { configureOrtWasm, ort } from "./ortSetup";
import type { EncodedVector, ModelMetadata, SkillId } from "./types";

const MODEL_URL = "/dkt.onnx";
const METADATA_URL = "/model-metadata.json";

export interface DktPredictions {
  currentSkill: number;
  allSkills: number[];
}

export class DktModel {
  private session: ort.InferenceSession | null = null;
  readonly metadata: ModelMetadata;

  private constructor(metadata: ModelMetadata, session: ort.InferenceSession) {
    this.metadata = metadata;
    this.session = session;
  }

  static async load(): Promise<DktModel> {
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
    return new DktModel(metadata, session);
  }

  async predictNext(
    history: EncodedVector[],
    skillId: SkillId,
  ): Promise<DktPredictions> {
    if (!this.session) {
      throw new Error("Model session is not loaded");
    }

    const { numSkills } = this.metadata;
    const seqLen = history.length + 1;
    const flat = new Float32Array(seqLen * numSkills * 2);

    for (let step = 0; step < history.length; step++) {
      flat.set(history[step], step * numSkills * 2);
    }

    const tensor = new ort.Tensor("float32", flat, [1, seqLen, numSkills * 2]);
    const output = await this.session.run({ interactions: tensor });
    const predictions = output.predictions.data as Float32Array;
    const step = seqLen - 1;

    const allSkills: number[] = [];
    for (let skill = 0; skill < numSkills; skill++) {
      allSkills.push(predictions[step * numSkills + skill]);
    }

    return {
      currentSkill: allSkills[skillId],
      allSkills,
    };
  }

  encode(skillId: SkillId, correct: boolean): EncodedVector {
    return encodeInteraction(skillId, correct, this.metadata.numSkills);
  }
}
