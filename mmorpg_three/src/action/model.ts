import { encodeAction } from "./encoder";
import { configureOrtWasm, ort } from "./ortSetup";
import type { ActionId, EncodedVector, ModelMetadata } from "./types";

const MODEL_URL = "/next-action.onnx";
const METADATA_URL = "/model-metadata.json";

export interface ActionPredictions {
  actionProbs: number[];
}

export class ActionPredictorModel {
  private session: ort.InferenceSession | null = null;
  readonly metadata: ModelMetadata;

  private constructor(metadata: ModelMetadata, session: ort.InferenceSession) {
    this.metadata = metadata;
    this.session = session;
  }

  static async load(): Promise<ActionPredictorModel> {
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
    if (metadata.modelType !== "next-action-lstm") {
      throw new Error(`Unsupported model type: ${metadata.modelType}`);
    }

    return new ActionPredictorModel(metadata, session);
  }

  async predictNext(history: EncodedVector[]): Promise<ActionPredictions> {
    if (!this.session) {
      throw new Error("Model session is not loaded");
    }

    const { numActions } = this.metadata;
    const seqLen = history.length + 1;
    const flat = new Float32Array(seqLen * numActions);

    for (let step = 0; step < history.length; step++) {
      flat.set(history[step], step * numActions);
    }

    const tensor = new ort.Tensor("float32", flat, [1, seqLen, numActions]);
    const output = await this.session.run({ actions: tensor });
    const predictions = output.predictions.data as Float32Array;
    const step = seqLen - 1;

    const actionProbs: number[] = [];
    for (let action = 0; action < numActions; action++) {
      actionProbs.push(predictions[step * numActions + action]);
    }

    return { actionProbs };
  }

  encode(actionId: ActionId): EncodedVector {
    return encodeAction(actionId, this.metadata.numActions);
  }
}
