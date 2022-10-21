import express from 'express'
import got from 'got'
import cheerio from 'cheerio'

const app = express()

app.all('/', (req, res) => {
    res.send(new Date().toISOString())
})


app.all('/candidates', async (req, res) => {
    try {
        // console.log(req.method, req.url)
        let start = Date.now()
        let base = 'https://ivoterguide.com'
        let root = `${base}/my-ballot?${req._parsedUrl.query}`
        let ballot = await got(root).text()
        let $ = cheerio.load(ballot)
        let h3 = $('h3:contains("U.S. Senator"), h3:contains("U.S. Rep., Dist.")')
        let div = h3.parent().parent().next()
        let party = div.find('span.party:contains("Democrat"), span.party:contains("Republican")')
        let as = party.parent().prev().find('a[href^="/candidate?"]')
        let urls = as.map((i, x) => x.attribs.href).get()
        let pages = await Promise.all(urls.map(u => got(base + u).text()))
        let candidates = pages.map(page => {
            let $ = cheerio.load(page)
            let name = $('dt:contains("Name")').next().text()
            let party = $('dt:contains("Party")').next().text()
            let race = $('dt:contains("Race")').next().text().slice(5).split('.')[0]
            let incumbent = $('dt:contains("Incumbent")').next().text()
            let photo = $('header.profile-hero img').attr('src')
            let links = $('dd > a, div.dropdown-inner > a').map((i, x) => x.attribs.href).get()
            return { name, party, race, incumbent, photo, links }
        })
        console.log(req.method, req.url, candidates.length, Math.round(Date.now() - start))
        res.send(candidates)
    } catch (error) {
        console.error(req.method, req.url, error)
        res.send({ error })
    }
})

app.listen(process.env.PORT || 80)