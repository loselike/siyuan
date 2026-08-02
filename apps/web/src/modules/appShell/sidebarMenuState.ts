export function resolveExpandedMenuAfterPrimaryClick<T extends string>(input: {
  clickedKey: T;
  currentKey: T;
  expandedKey: T | null;
  hasSubNav: boolean;
}) {
  const isActiveDirectory = input.clickedKey === input.currentKey && input.hasSubNav;

  if (!isActiveDirectory) {
    return {
      shouldNavigate: true,
      expandedKey: input.clickedKey
    } as const;
  }

  return {
    shouldNavigate: false,
    expandedKey: input.expandedKey === input.clickedKey ? null : input.clickedKey
  } as const;
}
