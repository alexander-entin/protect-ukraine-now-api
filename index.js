import express from 'express'
import got from 'got'
import cheerio from 'cheerio'

const app = express()

app.all('/candidates', async (req, res) => {
    // console.log(req.method, req.url)
    let start = performance.now()
    try {
        let base = 'https://ivoterguide.com'
        let root = `${base}/my-ballot?${req._parsedUrl.query}`
        let ballot = await got(root).text()
        let $ = cheerio.load(ballot)
        let h3 = $('h3:contains("U.S. Rep., Dist.")')
        let div = h3.parent().parent().next()
        let as = div.find('h4 a[href^="/candidate?"]')
        let urls = as.map((i, x) => x.attribs.href).get()
        let pages = await Promise.all(urls.map(u => got(base + u).text()))
        let candidates = pages.map(page => {
            let $ = cheerio.load(page)
            let name = $('h2.hero-title div').text()
            let photo = $('header.profile-hero img').attr('src')
            let links = $('dd > a').map((i, x) => x.attribs.href).get()
            return { name, photo, links }
        })
        console.log(req.method, req.url, candidates.length, Math.round(performance.now() - start))
        res.send(candidates)
    } catch (error) {
        console.error(req.method, req.url, error)
        res.send({ error })
    }
})

app.listen(process.env.PORT || 80)