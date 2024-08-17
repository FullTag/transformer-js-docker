import { readFile, writeFile} from 'fs/promises'
import YAML from 'yaml'
import pLimit from 'p-limit'
import { downloadFile,  } from '@huggingface/hub'
import { z } from 'zod'
import { dirname } from 'path'
import { mkdirp } from 'mkdirp'

const schema = z.record(z.string(), z.object({
  filenames: z.array(z.string()),
}))

const HUGGINGFACE_YAML = process.env.HUGGINGFACE_YAML || 'huggingface.yaml'
const LOCAL_DIR = process.env.LOCAL_DIR || 'cache'
const limit = pLimit(6)

// read yaml file
const yaml = schema.parse(YAML.parse(await readFile(HUGGINGFACE_YAML, 'utf8')))
const downloads = []

async function ensureDir(filename) {
  return mkdirp(dirname(filename))
}

for (const [repo, options] of Object.entries(yaml)) {
  downloads.push(...options.filenames.map(path => ensureDir(`${LOCAL_DIR}/${repo}/${path}`).then(limit(
    () => downloadFile({
      repo,
      path,
    }).then(
      (file) => file.blob().then(
        async (blob) => writeFile(`${LOCAL_DIR}/${repo}/${path}`, Buffer.from(await blob.arrayBuffer()))
          .then(() => console.log(`Successfully downloaded ${LOCAL_DIR}/${repo}/${path}`)))
          .catch((err) => console.error(`Failed to write ${LOCAL_DIR}/${repo}/${path}`, err))
    ).catch((err) => console.error(`Failed to download ${repo}/${path}`, err))
  ))))
}

await Promise.all(downloads)
