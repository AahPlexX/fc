export interface MetadataEntry {
  readonly group: string;
  readonly name: string;
  readonly value: string | number | boolean | readonly string[] | readonly number[];
}

export const normalizeMetadata = (_groups: Record<string, unknown>): readonly MetadataEntry[] => [];

export const inspectMetadata = async (_bytes: ArrayBuffer): Promise<readonly MetadataEntry[]> => [];
