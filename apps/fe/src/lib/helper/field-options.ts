export type FieldOption = { id: string; value: string; color?: string };

// The options endpoint returns a bare array when unpaged and { data, total }
// when a page is asked for, so pickers normalize before rendering.
export const toFieldOptions = (response: unknown): FieldOption[] => {
  if (Array.isArray(response)) return response as FieldOption[];

  const paged = response as { data?: FieldOption[] } | null;
  return paged?.data ?? [];
};

export type FieldOptionsPage = {
  data: FieldOption[];
  total: number;
  // The field's display name, so a page can title itself
  field?: string;
};

// The same endpoint answers a bare array when unpaged, so a paged read narrows
// here rather than at each call site.
export const toFieldOptionsPage = (response: unknown): FieldOptionsPage => {
  if (Array.isArray(response)) {
    const data = response as FieldOption[];
    return { data, total: data.length };
  }

  const paged = response as Partial<FieldOptionsPage> | null;
  return {
    data: paged?.data ?? [],
    total: paged?.total ?? 0,
    field: paged?.field,
  };
};
