const {send} = require('micro')
const fetch = require('node-fetch')
const baseUrl = 'https://backend.b-works.io/'
const activeLanguages = ['de', 'en']
const cache = {}

module.exports = async (req, res) => {
  if (/favicon.ico/.test(req.url)) {
    return send(res, 404)
  }

  const startTime = Date.now()
  const refresh = /\brefresh\b/.test(req.url)

  return {
    queues: await getQueues(refresh),
    contents: await getContents(refresh),
    tags: await getTags(refresh),
    time: Date.now() - startTime
  }
}

async function getQueues (refresh) {
  if (cache.queues && !refresh) {
    return cache.queues
  }
  const request = await fetch(baseUrl + 'spa_api/contents_map?_format=json')
  return cache.queues = request.json()
}

async function getContents (refresh) {
  if (cache.contents && !refresh) {
    return cache.contents
  }
  // See https://blog.lavrton.com/javascript-loops-how-to-handle-async-await-6252dd3c795
  const promises = activeLanguages.map(getContentsTranslated)
  return cache.contents = await Promise.all(promises)
}

async function getContentsTranslated (lang) {
  const request = await fetch(baseUrl + lang + '/spa_api/contents?_format=json')
  const response = await request.json()

  // Filter response
  const contents = {}
  contents[lang] = {}
  Object.keys(response).forEach(key => {
    const node = response[key]
    if ('body' in node && node.body.length) {
      delete node.body[0].processed
    }
    contents[lang][key] = node
  })
  return contents
}

async function getTags (refresh) {
  if (cache.tags && !refresh) {
    return cache.tags
  }

  const request = await fetch(baseUrl + 'spa_api/taxonomy_terms?_format=hal_json')
  const response = await request.json()

  // Filter response
  const tags = {}
  Object.keys(response).forEach(key => {
    tags[key] = response[key].name
  })
  return cache.tags = tags
}
