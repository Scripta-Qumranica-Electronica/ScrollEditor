// One common type for all sides in the system
// We do not use a string enum, because converting a string to an enum value is painful (Side[s as keyof typeof Side])
export type Side = 'recto' | 'verso';
