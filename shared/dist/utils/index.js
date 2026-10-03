/** Narrow unknown values to a non-empty string. */
export function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
