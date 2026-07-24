# Algerian phone validation fix

Accepted formats now include:

- `0552080462`
- `05 52 08 04 62`
- `+213552080462`
- `213552080462`
- `00213552080462`

All accepted numbers are normalized to `+213...` before being saved and sent.

Important: an Algerian mobile number must contain 9 digits after `+213`.
For example, `+21351986353` has only 8 digits after `+213`, so it is genuinely incomplete.
