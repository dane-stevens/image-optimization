import z, { treeifyError } from "zod";

const ENV = z.object({
  'S3_ACCESS_KEY_ID': z.string({ error: (val) => `[MISSING_ENV_VARIABLE]: ${val.path}` }),
  'S3_SECRET_ACCESS_KEY': z.string({ error: (val) => `[MISSING_ENV_VARIABLE]: ${val.path}` }),
  'S3_ENDPOINT': z.string({ error: (val) => `[MISSING_ENV_VARIABLE]: ${val.path}` }).default('https://test.example.com'),
  'S3_BUCKET': z.string({ error: (val) => `[MISSING_ENV_VARIABLE]: ${val.path}` }),
  'S3_REGION': z.string().default('auto')
})

const parsedEnv = ENV.safeParse(process.env)
if (!parsedEnv.success) {
  const errors = treeifyError(parsedEnv.error)
  for (const errorKey in errors.properties) {
    console.error(errors.properties[errorKey]?.errors?.[0])
  }
  process.exit(1)
}

export const env = parsedEnv.data || {} 