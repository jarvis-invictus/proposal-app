const { extractBrandKitFromUrl } = require('../lib/brand-extraction/url')

async function test() {
  const url = process.argv[2]
  if (!url) {
    console.error("Please provide a URL")
    process.exit(1)
  }
  
  console.log(`Extracting brand kit from ${url}...`)
  try {
    const data = await extractBrandKitFromUrl(url)
    console.log("Success!")
    console.log(JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Extraction failed:", err)
  }
}

test()
