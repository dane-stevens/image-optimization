import sharp from 'sharp'
import { s3, S3Client, S3File } from 'bun'
import { pipeline } from 'stream/promises'
import { PassThrough } from 'stream'


const client = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET,
  bucket: 'uploads',
  endpoint: `https://${process.env.S3_ACCOUNT_ID}.r2.cloudflarestorage.com`
})

function getPreferredFormat(acceptHeader: string | undefined) {
  if (acceptHeader?.includes('image/avif')) {
    return {
      mimetype: 'image/avif',
      format: 'avif'
    }
  }
  if (acceptHeader?.includes('image/webp')) {
    return {
      mimetype: 'image/webp',
      format: 'webp'
    }
  }
  return {
    mimetype: 'image/jpeg',
    format: 'jpeg'
  }
}

Bun.serve({
  port: 3001,
  async fetch(request) {

    try {

      const headers = {
        "Cache-Control": "max-age=86400, s-maxage=860400",
        "Content-Type": "image/jpeg",
      };


      const url = new URL(request.url)
      console.log(url.pathname)


      const height = Number(url.searchParams.get('height'))

      const key = url.pathname
      const file: S3File = client.file(key)
      if (!(await file.exists())) {
        return new Response('Not found', { status: 404 })
      }

      const stream = file.stream()

      const { mimetype, format } = getPreferredFormat(request.headers.get('Accept'))
      headers['Content-Type'] = mimetype

      const transformer = sharp().resize({ height }).autoOrient().toFormat(format)
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