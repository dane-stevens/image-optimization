import sharp from 'sharp'
import { S3Client, S3File } from 'bun'
import { pipeline } from 'stream/promises'
import { PassThrough } from 'stream'
import { env } from './env'
import z, { prettifyError, treeifyError } from 'zod'

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_BUCKET, S3_REGION } = env

const client = new S3Client({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  bucket: S3_BUCKET,
  endpoint: S3_ENDPOINT,
  ...(S3_REGION && { S3_REGION })

})

const headers = {
  avif: {
    mimetype: 'image/avif',
    format: 'avif'
  },
  webp: {
    mimetype: 'image/wepb',
    format: 'webp'
  },
  jpeg: {
    mimetype: 'image/jpeg',
    format: 'jpeg'
  },
  png: {
    mimetype: 'image/png',
    format: 'png'
  }
} as const


function getPreferredFormat(acceptHeader: string | null, returnFormat: z.infer<typeof Payload>['format']) {

  let returnValue = headers.jpeg


  Object.keys(headers).map(key => {
    const current = headers[key]
    if (acceptHeader?.includes(current.mimetype)) returnValue = current
  })

  if (returnFormat) {
    returnValue = headers[returnFormat]
  }

  return returnValue
}

const formats = ['jpeg', 'avif', 'webp', 'png'] as const

const Payload = z.object({
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  format: z.enum(formats).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  rotate: z.optional(z.coerce.number().min(-360).max(360)),
  flip: z.optional(z.enum(['true', '1']).transform(() => true)),
  flop: z.optional(z.enum(['true', '1']).transform(() => true)),
  blur: z.optional(z.coerce.number().min(0.3).max(1000)),
  dilate: z.coerce.number().optional(),
  erode: z.coerce.number().optional(),
  negate: z.optional(z.enum(['true', '1']).transform(() => true)),
})

const server = Bun.serve({
  port: process.env.PORT || 3000,
  routes: {
    "/favicon.ico": () => new Response('OK'),
    "/": () => new Response('Please specify an image path')
  },
  async fetch(request) {

    try {

      const headers = {
        "Cache-Control": "max-age=86400, s-maxage=860400",
        "Content-Type": "image/jpeg",
      };

      const url = new URL(request.url)

      const parsedOptions = Payload.safeParse(Object.fromEntries(url.searchParams))

      if (!parsedOptions.success) {
        return new Response(prettifyError(parsedOptions.error), { status: 400 })
      }

      const { height, width, format: returnFormat, fit, rotate, flip, flop, blur, dilate, erode, negate } = parsedOptions.data


      const key = url.pathname
      const file: S3File = client.file(key)
      if (!(await file.exists())) {
        return new Response('Not found', { status: 404 })
      }

      const stream = file.stream()

      const { mimetype, format } = getPreferredFormat(request.headers.get('Accept'), returnFormat)
      headers['Content-Type'] = mimetype

      let transformer = sharp().autoOrient()

      if (height || width || fit) {
        transformer = transformer.resize({
          ...(height && { height }),
          ...(width && { width }),
          ...(fit && { fit }),
        })
      }

      if (blur) transformer = transformer.blur(blur)
      if (dilate) transformer = transformer.dilate(dilate)
      if (erode) transformer = transformer.erode(erode)
      if (negate) transformer = transformer.negate()
      if (flip) transformer = transformer.flip()
      if (flop) transformer = transformer.flop()
      if (rotate) transformer = transformer.rotate(rotate)


      transformer = transformer.toFormat(format)
      const passthrough = new PassThrough()

      pipeline(
        stream,
        transformer,
        passthrough
      ).catch(err => {
        console.error(err)
        passthrough.destroy()
      })

      return new Response(passthrough, {
        headers
      })

    }
    catch (err) {
      console.log(err)
      return new Response('Not found', { status: 404 })
    }
  }
})

console.log(`Listening on ${server.url}`)