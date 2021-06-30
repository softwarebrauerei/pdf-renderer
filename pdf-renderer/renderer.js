'use strict'

const chromium = require('chrome-aws-lambda');
const Mustache = require('mustache');

let response;

module.exports.render = async (event, context) => {
    const body = JSON.parse(event.body);
    if (!(body.template === null && body.data === null)) {
        const template = body.template;
        const templateData = body.data;

        const renderedTemplateHtml = Mustache.render(template, templateData);
        const fileName = body.desiredFilename || `pdf.pdf`;

        let browser = null;
        try {
            browser = await chromium.puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath,
                headless: chromium.headless
            });

            const page = await browser.newPage();
            await page.setContent(renderedTemplateHtml, {
                waitUntil: ['networkidle0','load','domcontentloaded'],
                timeout: 20000
            });

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
            });

            response = {
                headers: {
                    'Content-Type': 'application/pdf',
                    'content-disposition': `attachment; filename=${fileName}`,
                    'Content-Length': Buffer.byteLength(pdf, 'utf-8')
                },
                statusCode: 200,
                body: pdf.toString('base64'),
                isBase64Encoded: true
            };
        }
        catch (error) {
            response = {
                statusCode: 500,
                body: JSON.stringify({
                    statusCode: 500,
                    message: error.message
                })
            };
        }
        finally {
            if (browser !== null) {
                await browser.close();
            }
        }
    }
    else {
        response = {
            'statusCode': 400,
            'body': JSON.stringify({
                statusCode: 400,
                message: 'Bad Request'
            })
        };
    }

    return response;
};
