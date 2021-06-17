/* compteur de requêtes ea
 * global : le compteur incrémente chaque nouvelle requête reçue. Le compteur est décrémenté lorsqu'on supprime des éléments dans la popup.
 */
var clicks = 0;
var notif_permission = false;
var authentified = false;
var csv;

/* Paramètres fixes. Ils sont en fixe dans la var nativeParams et special_params. 
 * A voir si on peut dynamiser tout ca afin que ce soit géré directement depuis le wiki. 
 * par exemple en parsant la page des paramètres système.
 */
var nativeParams = ['fl', 'fra', 'sd', 'sa', 'ss', 'url', 'rf', 'euidlls'];
var special_params = ['prdp', 'ecf', 'eis'];
var system_compatibility = {
	'getrequest': typeof browser.webRequest === 'object' || false,
	'getresponse': typeof browser.webRequest.filterResponseData === 'function' || false
}


function RequestLog(call) {
	this.time = {
		ts: call.timeStamp,
		timeOrigin: "",
		timeElapsed: ""
	};
	this.snap = "";
	this.type = "";
	this.rawcol = call.url;
	this.call_type = "";
	this.etuix = "";
	this.website = "";
	this.params = [];
	this.domain = call.url.split('/')[2];
	this.origin_url = call.originUrl;
	this.page_url = "";
	this.id = call.requestId;
	this.tab_id = call.tabId;
	this.firstparty = false;
	this.response_status = false;
	this.response = "";
	this.nb_tms = 0;
	this.tms_tags = [];
	this.nb_s2s = 0;
	this.s2s_connectors = [];
}

function launchDownload(request, s, sR) {
	console.log(request);
	browser.downloads.download({
		url: URL.createObjectURL(request.csv),
		filename: 'ea_requests' + Date.now() + '.csv',
	});
}

browser.runtime.onMessage.addListener(launchDownload);



RequestLog.prototype.addParam = function (prm) {
	this.params.push(prm);
};
RequestLog.prototype.updateTime = function (ot) {
	this.time.timeOrigin = ot;
	this.time.timeElapsed = this.time.ts - this.time.timeOrigin;
};
RequestLog.prototype.detectTagType = function (params_names) {
	let param_detectors = { 'prdr0': 'produit', 'prdr1': 'catégorie', 'eise': 'search', 'scart': 'panier', 'ref': 'vente', 'estimate': 'devis' }
	Object.entries(param_detectors).forEach(([key, val]) => { this.call_type = params_names.includes(key) && val || this.call_type; });
	this.call_type = !this.call_type && "Générique" || this.call_type;
};

RequestLog.prototype.sorting = function (key) {
	this.params.sort((a, b) => { return a[key] < b[key] && -1 || a[key] > b[key] && 1 || 0 });
};

/* Storing a new request into Local Storage and then notify main.js about via sendmessage */
function memorize(request) {
	browser.storage.local
		.set({
			[request.id]: request
		})
		.then(function () {
			console.log("request", request);

			browser.storage.local.get().then(_ => {
				clicks = Object.keys(_).filter(id => !isNaN(id)).length;
				browser.browserAction.setBadgeText({ text: clicks.toString() });
				browser.browserAction.setBadgeBackgroundColor({ color: "#6098f2" });
			});

			browser.runtime.sendMessage({
				event: "new request",
				id: request.id.toString()
			});

			notif_permission && browser.notifications.create({
				"type": "basic",
				"title": request['response_status'] && browser.i18n.getMessage("notification-sitecentrictagtriggered-title-ok", request.call_type) || browser.i18n.getMessage("notification-sitecentrictagtriggered-title-false", request.call_type),
				"message": request['response_status'] && browser.i18n.getMessage("notification-sitecentrictagtriggered-message-ok", [request.call_type, (request.firstparty ? '1st' : '3rd') + 'party', request.page_url, (request.time.timeElapsed / 1000).toFixed(2), request.website]) || browser.i18n.getMessage("notification-sitecentrictagtriggered-message-false", [request.call_type, (request.firstparty ? '1st' : '3rd') + 'party', request.page_url])
			});
		});
}

/* Parse the URL query string and return an array of non-empty pairs */
function getQueryParameters(url) {
	var qs = url.substring(url.indexOf('?') + 1);
	return qs.split('&').filter(q => q.length > 0);
}

function shakeUp(prefix_searched, queryparameter, outcome) {
	let flag = (prefix_searched === "prdp" ? 'product' : (prefix_searched === "ecf" ? 'context-flag' : (prefix_searched === "eis" ? 'search' : 'nc')));
	let key = prefix_searched + queryparameter[0].match(/\d/g).join("");
	let type_qs = queryparameter[0].includes('k') && "name" || "value";
	outcome[key] = outcome[key] || { "name": "", "value": "", flag };
	outcome[key][type_qs] = (type_qs === "name" ? `${key}-` : "") + decodeURIComponent(queryparameter[1]);

	return outcome[key]["name"] && outcome[key]["value"] && key || ''

}

function empty(str) { return str === '' }
/* Filtrer sur les requêtes enregistrées || injection du content-script || parsing des url queries... */
function requestGrinder(call) {
	if (/\/(dynclick|dynview)\//.test(call.url)) {

		var ad_request = {
			type: "ad",
			website: call.url.match(/\/(dynclick|dynview)\/(.+?)\//i)[2],
			corv: call['url'].includes("/dynclick/") && "click" || "view",
			nb_redir: 0,
			time: { ts: call.timeStamp },
			req: [{
				url: call.url,
				urldomains: call.url.split("?").filter(_ => _.includes("http")),
				timestamp: call.timeStamp,
				params: call.url.split('?')[1].split('&').map(function (elem) { return { name: elem.split('=')[0], value: decodeURIComponent(elem.split('=')[1]) } })

			}],
			id: call.requestId
		};
		ad_request['landing_page'] = (ad_request['corv'] === 'click' ? call.url.match(/eurl=(.+)/i)[1] : '');

		let canal_params = call.url.split('?')[1].split('&').map(elem => elem.split('=')[0]).filter(param => param.match(/(.+?)\-/i)).map(param => param.match(/(.+?)\-/i)[1]);

		canal_params = [...new Set(canal_params)].filter(v => !(['eseg', 'ea'].includes(v)));

		ad_request['canal'] = canal_params.toString();
		ad_request['cmp_name'] = ad_request['req'][0].params.filter(param => param.name === ad_request['canal'] + "-name" || param.name === ad_request['canal'] + "-k")[0]['value'];
		ad_request['pblish_name'] = ad_request['req'][0].params.filter(param => param.name === ad_request['canal'] + "-publisher" || param.name === ad_request['canal'] + "-k")[0]['value'];

		if (ad_request['pblish_name'] === ad_request['cmp_name']) ad_request['pblish_name'] = ad_request['cmp_name'].split('|')[0];



		browser.storage.local.get(ad_request.id).then(strdreq => {
			storedreq = Object.assign({}, strdreq[ad_request.id]);

			storedreq.req = storedreq.req || [];
			ad_request['req'] = ad_request['req'].concat(storedreq.req);
			ad_request['nb_redir'] = ad_request['req'].length;
			console.log("ad_request", ad_request);
			browser.storage.local.set({ [ad_request.id]: ad_request });
			browser.storage.local.get().then(_ => {
				clicks = Object.keys(_).length;
				browser.browserAction.setBadgeText({ text: clicks.toString() });
				browser.browserAction.setBadgeBackgroundColor({ color: "#6098f2" });
			});




			browser.runtime.sendMessage({ event: "new request", id: ad_request.id.toString() });
		});

















	} else if (/\/(col\d{1,3}[a-z]{0,1}|collector)\//.test(call.url)) {
		var request = new RequestLog(call);
		request.type = "site";

		var capturing = browser.tabs.captureTab(request.tab_id, { format: "jpeg", quality: 10 });
		capturing.then(img => { request.snap = img });


		if (system_compatibility.getrequest && system_compatibility.getresponse) {
			var filter = browser.webRequest.filterResponseData(call.requestId);
			var decoder = new TextDecoder("utf-8");
			var encoder = new TextEncoder();

			/*RESPONSE GRINDER*/
			filter.ondata = event => {
				const response_str = decoder.decode(event.data, { stream: true });
				request['response_status'] = (response_str.length > 1 ? true : false);
				request['response'] = response_str;

				if (request.response_status) {
					request['etuix'] = response_str.match(/_oEa\.uidset\(\"(.+?)\"\)/i);
					if (request['etuix']) { request['etuix'] = request['etuix'][1] } else { request['etuix'] = "" }
					request['website'] = response_str.match(/_oEa\.website\(\"(.+?)\"\)/i);
					if (request['website']) { request['website'] = request['website'][1] } else { request['etuix'] = "" }

					let tags = response_str.match(/\/\* \{ccmt\:((.|\n)+?)\}catch\(e\)\{_oEa\.log\(\'ETM\'\,e\)\;\}/gi);
					let dcs = response_str.match(/\{dc\:((.|\n)+?)dcrundone\[\"[0-9]+\"\]\=[01]\;/gi);

					/* S2S GRINDER */
					if (dcs !== null) {
						request['nb_s2s'] = dcs.length;
						request['s2s_connectors'] = request['nb_s2s'] && dcs.map(_dc => {
							let dcOutcome = {
								"done": _dc.match(/_oEa\.dcrundone\[\"\d+\"\]\=(\d)\;/i) || false
							};
							if (typeof dcOutcome['done'] === 'object') {
								dcOutcome['done'] = (dcOutcome['done'][1] === "1" ? true : false);
							}
							_dcMetaArray = _dc.split('\n')[0].match(/\b(?!\s)[^,\/\*\{\}]+/gi);
							for (let i = 0; i < _dcMetaArray.length; i++) {
								if (_dcMetaArray[i].includes(':')) {
									dcOutcome[_dcMetaArray[i].split(':')[0]] = _dcMetaArray[i].split(':')[1]
								} else { dcOutcome[_dcMetaArray[i]] = true; }
							}
							console.log(_dc);
							console.log(dcOutcome);
							if (dcOutcome['mode'] === "RD") {
								dcOutcome['url'] = _dc.match(/(https?:)?\/\/([^"')]+)/gi) || false
							}

							return dcOutcome;
						});
					}
					/*TMS GRINDER*/
					if (tags !== null) {
						request['nb_tms'] = tags.length;

						request['tms_tags'] = request['nb_tms'] && tags.map(_tag => {
							let tagOutcome = {
								"type": _tag.match(/\/\* \/?([A-Z]{1,2}([a-z]+?|[A-Z])) \*\//)[1],
								"url": _tag.match(/(https?:)?\/\/([^"')]+)/gi) || "",
								"tag": _tag.match(/\/\* [A-Z][a-z]+? \*\/\n((.|\n)+?)\n \/\* \/mtjs \*\//i)[1],
								"partner": "",
								"done": _tag.match(/_oEa\.mtrundone\[\"\d+\"\]\=(\d)\;/i) || false
							};
							if (typeof tagOutcome['url'] === 'object' && tagOutcome['url']['0'].split('.').length > 1) {
								tagOutcome['partner'] = tagOutcome['url'][0].match(/(?:[\w-]+\.)+[\w-]+/).toString();
								tagOutcome['url'] = tagOutcome.url[0];
								if (/(rpset|google_cm|mwsu)/.test(tagOutcome['url'])) { tagOutcome['type'] = "cm" }
							}
							if (typeof tagOutcome['done'] === 'object') {
								tagOutcome['done'] = (tagOutcome['done'][1] === "1" ? true : false);
							}

							_TagMetaArray = _tag.split('\n')[0].match(/\b(?!\s)[^,\/\*\{\}]+/gi);

							for (let i = 0; i < _TagMetaArray.length; i++) {
								if (_TagMetaArray[i].includes(':')) {
									tagOutcome[_TagMetaArray[i].split(':')[0]] = _TagMetaArray[i].split(':')[1]
								} else { tagOutcome[_TagMetaArray[i]] = true; }
							}
							return tagOutcome;
						});
					}
				}
				filter.write(encoder.encode(response_str))
				filter.disconnect();

				browser.tabs
					.executeScript(request.tab_id, { code: `var time = performance.timing.fetchStart;time;` })
					.then(function (e) {
						request.updateTime(e[0]);
						console.log("url", request.page_url);
						console.log("url", request);
						//Stockage de l'objet request dans le local storage du browser
						if (request.params.filter(_ => _.flag === 'system').length > 3 === true ||/\/collector\//.test(request.rawcol)) {
							console.log("url", request.page_url);
							//hack tracking par parametre dans le parallel tracking
							if (/e..-publisher/.test(request.page_url)){



								var ad_request = {
									canal: request.page_url.match(/\?(.*)?(e..)-publisher/i)[2],
									type: "ad",
									cmp_name: "test",
									website: request.website,
									landing_page: request.page_url,
									corv: "click",
									nb_redir: 0,
									pblish_name: "",
									time: { ts: request.time.ts - 100 },
									req: [{
										url: request.page_url,
										urldomains: request.domain,
										timestamp: request.time.ts - 100,
										params: request['page_url'].split('?')[1].split('&').map(function (elem) { return { name: elem.split('=')[0], value: decodeURIComponent(elem.split('=')[1]) } })

									}],
									id: (request.id - 1)
								};

								ad_request['pblish_name'] = ad_request['req'][0].params.filter(param => param.name === ad_request['canal'] + "-publisher" || param.name === ad_request['canal'] + "-k")[0]['value'].split('|')[0];

								ad_request['cmp_name'] = ad_request['req'][0].params.filter(param => param.name === ad_request['canal'] + "-name" || param.name === ad_request['canal'] + "-k")[0]['value'].split('|').filter(name => /(g\d\d\d\d)/.test(name))[0];

								browser.storage.local.set({ [ad_request.id]: ad_request });
								browser.storage.local.get().then(_ => {
									clicks = Object.keys(_).length;
									browser.browserAction.setBadgeText({ text: clicks.toString() });
									browser.browserAction.setBadgeBackgroundColor({ color: "#6098f2" });
								});


								browser.runtime.sendMessage({ event: "new request", id: ad_request.id.toString() });


							}

								ad_request['pblish_name'] = ad_request['req'][0].params.filter(param => param.name === ad_request['canal'] + "-publisher" || param.name === ad_request['canal'] + "-k")[0]['value'].split('|')[0];

								ad_request['cmp_name'] = ad_request['req'][0].params.filter(param => param.name === ad_request['canal'] + "-name" || param.name === ad_request['canal'] + "-k")[0]['value'].split('|').filter(name => /(g\d\d\d\d)/.test(name))[0];

								browser.storage.local.set({ [ad_request.id]: ad_request });
								browser.storage.local.get().then(_ => {
									clicks = Object.keys(_).length;
									browser.browserAction.setBadgeText({ text: clicks.toString() });
									browser.browserAction.setBadgeBackgroundColor({ color: "#6098f2" });
								});


								browser.runtime.sendMessage({ event: "new request", id: ad_request.id.toString() });


							}
							console.log(request);
							memorize(request);
						}
					}).catch(err => console.error("Aïe", err));
			}
		} else {
			request['response_status'] = "nc";
			browser.tabs
				.executeScript(request.tab_id, { code: `var time =  performance.timing.fetchStart;time;` })
				.then(function (e) {
					request.updateTime(e[0]);

					//Stockage de l'objet request dans le local storage du browser
					if (request.params.filter(_ => _.flag === 'system').length > 3 === true) { memorize(request) };
				}).catch(err => console.error("Aïe", err));
		}

		var outcome_params = {};
		getQueryParameters(call.url).forEach(function (qs) {
			let key, pair = qs.split('=');

			//Apply specific shakeUp for filtered parameters
			special_params.forEach(function (prefx) {
				if (pair[0].includes(prefx) && pair[0].includes('eise') === false) {
					key = shakeUp(prefx, pair, outcome_params)
				}
			});

			//Catch URL & check 1STPARTY
			pair[0] === 'url' && Object.assign(request, {
				"page_url": decodeURIComponent(pair[1]),
				"firstparty": decodeURIComponent(pair[1]).includes(request.domain.split('.').splice(1).join('.'))
			});

			//Add new param set to request.params
			if (!empty(key)) {
				let name = (outcome_params[key] ? outcome_params[key]['name'] : pair[0]);
				let value = (outcome_params[key] ? outcome_params[key]['value'] : decodeURIComponent(pair[1]));
				let flag = (outcome_params[key] ? outcome_params[key]['flag'] : (nativeParams.includes(pair[0]) ? "system" : (pair[0].includes('prd') ? "product" : (pair[0].includes('eis') ? "search" : "not-tested"))));
				if (name === "eemail") var nickname = "email";
				else if (name === "urlp") var nickname = "path";
				else if (name.includes("prdn")) var nickname = "prdname";
				else if (name.includes("prdr")) var nickname = "prdref";
				else if (name.includes("prda")) var nickname = "prdamount";
				else if (name.includes("prdg")) var nickname = "prdgroup";

				request.addParam({ name, nickname, value, flag });
			}
		});

		//Trouver le type de tag entre panier/produit/catégorie/générique...
		request.detectTagType(request.params.map(_val => _val['name']));
		request.sorting('name');

		var productsortOrder = [];

		Array.from({ length: 9 }, (v, k) => ["prdr" + k, "prdn" + k, "prdg" + k, "prda" + k, "prdp" + k]).forEach(i => i.forEach(v => productsortOrder.push(v)));



		request.params = request.params.sort((a, b) => productsortOrder.indexOf(a.name.slice(0, 5)) - productsortOrder.indexOf(b.name.slice(0, 5)));
	}
}

chrome.webRequest.onBeforeRequest.addListener(requestGrinder, { urls: ["<all_urls>"] }, ["blocking"]);
