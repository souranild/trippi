import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json([])
  }

  try {
    // 1. Search for pages
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()
    
    if (!searchData.query?.search?.length) {
      return NextResponse.json([])
    }

    const pageTitles = searchData.query.search.slice(0, 3).map((p: any) => p.title)
    const images: string[] = []

    for (const title of pageTitles) {
      // 2. Get images for each page
      const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages|images&pithumbsize=1000&format=json&origin=*`
      const imagesRes = await fetch(imagesUrl)
      const imagesData = await imagesRes.json()
      
      const pages = imagesData.query.pages
      const pageId = Object.keys(pages)[0]
      const page = pages[pageId]
      
      if (page.thumbnail?.source) {
        images.push(page.thumbnail.source)
      }
      
      // Also check for gallery images
      if (page.images) {
         // Get actual URLs for the first few images
         const imagePromies = page.images.slice(0, 8).map(async (img: any) => {
           if (img.title.match(/\.(jpg|jpeg|png)$/i)) {
             const imgInfoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(img.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`
             const infoRes = await fetch(imgInfoUrl)
             const infoData = await infoRes.json()
             const infoPages = infoData.query.pages
             const infoId = Object.keys(infoPages)[0]
             return infoPages[infoId].imageinfo?.[0]?.url
           }
           return null
         })
         const urls = await Promise.all(imagePromies)
         urls.forEach(url => {
           if (url && !images.includes(url)) images.push(url)
         })
      }
    }

    return NextResponse.json(images.slice(0, 20))
  } catch (error) {
    console.error('Wiki images error:', error)
    return NextResponse.json([])
  }
}
