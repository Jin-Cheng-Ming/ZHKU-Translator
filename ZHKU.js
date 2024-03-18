{
	"translatorID": "c02bb992-a224-42dd-8416-e0458d221c3d",
	"label": "ZHKU",
	"creator": "锦诚明",
	"target": "http://192.168.89.9:8080/search/article",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-18 09:22:10"
}

/*
		***** BEGIN LICENSE BLOCK *****

		Copyright © 2022 Jin-Cheng-Ming 

		This file is part of Zotero.

		Zotero is free software: you can redistribute it and/or modify
		it under the terms of the GNU Affero General Public License as published by
		the Free Software Foundation, either version 3 of the License, or
		(at your option) any later version.

		Zotero is distributed in the hope that it will be useful,
		but WITHOUT ANY WARRANTY; without even the implied warranty of
		MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
		GNU Affero General Public License for more details.

		You should have received a copy of the GNU Affero General Public License
		along with Zotero. If not, see <http://www.gnu.org/licenses/>.

		***** END LICENSE BLOCK *****
*/


function detectWeb (doc, url) {
	// TODO: adjust the logic here
	if (url.includes('/search/article')) {
		return 'thesis';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults (doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb (doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape (doc, url = doc.location.href) {

	let newItem = new Zotero.Item("thesis");
	newItem.url = url;
	newItem.university = "仲恺农业工程学院";
	newItem.place = "广州市";
	newItem.title = ZU.xpath(doc, "//body/div/div/div/strong/h3")[0].innerText
	newItem.abstractNote = ZU.xpath(doc, "//*[@id='article_info']/div/div/div")[2].innerText.trim()
	newItem.attachments.push({
		title: "Snapshot",
		document: doc
	});
	let base_info_div = ZU.xpath(doc, "//*[@id='articledetail']/tbody/tr");
	for (let i = 0; i < base_info_div.length; i++) {
		let column = base_info_div[i].innerText.trim().split('\t')
		let column_name = column[0];
		let column_value = column[1];
		switch (column_name) {
			case '外文题名':
				break;
			case '学位':
				let degree
				if (column_value.includes(':')) {
					degree = column_value.split(':')
				} else if (column_value.includes('/')) {
					degree = column_value.split('/')
				}
				if (degree[0].trim() == '硕士') {
					newItem.thesisType = "硕士学位论文"
				}
				if (degree[0].trim() == '博士') {
					newItem.thesisType = "博士学位论文"
				}
				break;
			case '作者':
				newItem.creators.push({ lastName: column_value, creatorType: 'author' });
				break;
			case '第一导师姓名':
				newItem.creators.push({ lastName: column_value, creatorType: 'contributor' });
				break;
			case '第二导师姓名':
				newItem.creators.push({ lastName: column_value, creatorType: 'contributor' });
				break;
			case '中文关键词':
				tags = column_value.trim().split('；')
				for (let i = 0; i < tags.length; i++) {
					if (tags[i]) {
						newItem.tags.push({ tag: tags[i] })
					}
				}
				break;
			case '学位授予日期':
				newItem.date = column_value;
				break;
			default:
				if (column_value) {
					let item = column_name.concat('：', column_value, '\n')
					if (newItem.extra) {
						newItem.extra = newItem.extra.concat(item)
					} else {
						newItem.extra = item;
					}
				}
				break;
		}
	}
	let pdf_info = ZU.xpath(doc, "//*[@class='article_left_ul']/li/a")
	pdf_info.forEach(element => {
		if (element.innerText == "预览") {
			let pdf_url = url.substring(0, url.indexOf("/article")).concat("/", element.getAttribute("href"))
			let attachment = { url: pdf_url, title: newItem.title, mimeType: "application/pdf", }
			newItem.attachments.push(attachment);
		}
	})
	// Z.debug(newItem)
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://192.168.89.9:8080/search/article?id=2741",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "http://192.168.89.9:8080/search/article?id=3241",
		"detectedItemType": false,
		"items": []
	}
]
/** END TEST CASES **/
