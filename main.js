hljs.initHighlightingOnLoad();
ELEMENT.locale(ELEMENT.lang.fr)

function restrictKeys(object, auth_keys) {
	return Object.keys(object)
		.filter(key => auth_keys.includes(key))
		.reduce((o, k) => {
			o[k] = object[k];
			return o;
		}, {});
}
var bg = chrome.extension.getBackgroundPage();

var data = {
	bg,
	items: [],
	datalayer: {},
	datalayer_csv: "",
	headers: [],
	loading: true,
	formLabelAlign: {},
	textarea_plan_taguage: "",
	authentified: bg.authentified,
	user: {
		id: null,
		pwd: null
	}
};

browser.runtime.onMessage.addListener(
	function (msg) {
		if (msg.event === "new request") {
			browser.storage.local.get(msg.id).then(function (res) {
				console.log("yoyo", msg.id);
				data.items.unshift(res[msg.id]);
			});
		}
	}
);

browser.browserAction.setBadgeBackgroundColor({ color: "#e3e6ea" });


const innerTabs = {
	template: `<el-tabs type="border-card">
	<el-tab-pane>
			<span slot="label">{{ i18n.tab.overview.name }}</span>
			<div class="ea-params-grid">
			<div class="grid-name">{{ i18n.tab.overview.labelTagtype }}:</div><div class="grid-value"><el-tag size="small">{{ row.call_type }}</el-tag></div>
			<div class="grid-name">{{ i18n.tab.overview.labelCookie }}:</div><div class="grid-value">{{ row.etuix || "-"}}</div>
			<div class="grid-name">{{ i18n.tab.overview.labelLogTime }}</div><div class="grid-value">{{ row.time.ts | formatDate}}</div>
		</div>
		<hr style="display: block;height: 1px;border: 0;border-top: 1px solid #ccc;margin: 1em 0; padding: 0;">
		<div class="ea-params-grid">
			<div class="grid-name">{{ i18n.tab.overview.labelHostResponse }}:</div><div class="grid-value">{{ row.response_status }}</div>
			<div class="grid-name">{{ i18n.tab.overview.labelAttribTrafic }}:</div><div class="grid-value">{{ row.website || "-" }}</div>
			<div class="grid-name">{{ i18n.tab.overview.labelTrackingDomain }}:</div><div class="grid-value">{{ row.domain }} <el-tag size="mini" :type="(row.firstparty ? 'success':'warning')">{{ (row.firstparty ? '1st':'3rd') + "Party"  }}</el-tag></div>
			</div>
		<hr style="display: block;height: 1px;border: 0;border-top: 1px solid #ccc;margin: 1em 0; padding: 0;">
		<div class="ea-params-grid">
			<div class="grid-name">{{ i18n.tab.overview.labelTMS }}:</div><div class="grid-value">{{ (row.nb_tms ? "true":(row.response_status ? "false":"-")) }}</div>
			<div class="grid-name">{{ i18n.tab.overview.labelS2S }}:</div><div class="grid-value">{{ (row.nb_s2s ? "true":(row.response_status ? "false":"-")) }}</div>
		</div>
		<hr style="display: block;height: 1px;border: 0;border-top: 1px solid #ccc;margin: 1em 0; padding: 0;">
		<img :src="row.snap" style="height: 100%; width: 750px; object-fit: contain">
	</el-tab-pane>
		<el-tab-pane>
			<span slot="label">{{ i18n.tab.parameters.name }} <el-badge class="mark" :value="row.params.filter(a=>a.flag !=='system').length" /></span>
				<el-collapse :value="['1','2','3','4']">
					<el-collapse-item name="1" v-if="row.params.filter(a=>a.flag ==='not-tested').length > 0">
						<template slot="title">{{ i18n.tab.parameters.labelGeneral }} <b>({{row.params.filter(a=>a.flag ==='not-tested').length}})</b></template>

						<div class="ea-params-grid" v-for="item in row.params" :key="item.name" v-if="item.flag ==='not-tested'">
							<div class="grid-name" title="This is my tooltip">{{ item.name }}</div>
							<div class="grid-value">{{ item.value }}</div>
						</div>
					</el-collapse-item>
					<el-collapse-item name="2" v-if="row.params.filter(a=>a.flag ==='product').length > 0">
						<template slot="title">{{ i18n.tab.parameters.labelProduct }}<b>({{row.params.filter(a=>a.flag ==='product').length}})</b> <el-badge class="mark" :value="row.params.filter(a=>a.name.includes('prdr')).length + ' produit(s)'"/></template>

						<div v-for="item in row.params" :key="item.name" v-if="item.flag ==='product'">
						<br v-if="item.name.includes('prdr') && item.name !=='prdr0'">
						<div class="ea-params-grid"">
							<div class="grid-name" title="This is my tooltip">{{ item.name }}</div>
							<div class="grid-value">{{ item.value }}</div>
						</div>
						</div>
					</el-collapse-item>
					<el-collapse-item name="3" v-if="row.params.filter(a=>a.flag ==='context-flag').length > 0">
						<template slot="title">{{ i18n.tab.parameters.labelContextFlag }} <b>({{row.params.filter(a=>a.flag ==='context-flag').length}})</b></template>
						<div class="ea-params-grid" v-for="item in row.params" :key="item.name" v-if="item.flag ==='context-flag'">
							<div class="grid-name">{{ item.name }}</div>
							<div class="grid-value">{{ item.value }}</div>
						</div>
					</el-collapse-item>
					<el-collapse-item name="4"v-if="row.params.filter(a=>a.flag ==='search').length > 0">
						<template slot="title">{{ i18n.tab.parameters.labelSearch }} <b>({{row.params.filter(a=>a.flag ==='search').length}})</b></template>
						<div class="ea-params-grid" v-for="item in row.params" :key="item.name" v-if="item.flag ==='search'">
							<div class="grid-name">{{ item.name }}</div>
							<div class="grid-value">{{ item.value }}</div>
						</div>
					</el-collapse-item>
					<el-collapse-item name="5" v-if="row.params.filter(a=>a.flag ==='system').length > 0">
						<template slot="title">{{ i18n.tab.parameters.labelSystem }} <b>({{row.params.filter(a=>a.flag ==='system').length}})</b></template>
						<div class="ea-params-grid" v-for="item in row.params" :key="item.name" v-if="item.flag ==='system'">
							<div class="grid-name">{{ item.name }}</div>
							<div class="grid-value">{{ item.value }}</div>
						</div>
					</el-collapse-item>
				</el-collapse>
		</el-tab-pane>

		<el-tab-pane :disabled="(row.nb_tms > 0 ? false:true)">
			<span slot="label">{{ i18n.tab.tms.name }} <el-badge class="mark" :value="(row.nb_tms == 0 ? i18n.misc.empty :row.nb_tms)" /></span>
			<el-collapse>
				<el-collapse-item name="1" v-if="row.tms_tags.filter(a=>a.type ==='Img').length > 0">
					<template slot="title">{{ i18n.tab.tms.labelIMG }} <b>({{row.tms_tags.filter(a=>a.type ==='Img').length}})</b></template>
					<div v-for="item in row.tms_tags" :key="item.ccmt" v-if="item.type ==='Img'">
					<div style="display:block;margin-top:15px;padding-left:10px;border-left:3px solid #409EFF;"><i class="el-icon-share" :style="{ color:(item.done ? 'green': 'red' ) }"></i> {{ item.hdlr }} - id: {{ item.ccmt}}<span v-if="item.ccmtn != null">- nom: {{ item.ccmtn }}</span></div>
						<div style="display:block;color:#409EFF;padding-left:10px;border-left:3px solid #409EFF;" v-if="item.url != ''"> >>{{ item.url}} </div>
					</div>
				</el-collapse-item>

				<el-collapse-item name="2" v-if="row.tms_tags.filter(a=>a.type ==='Native').length > 0">
					<template slot="title">{{ i18n.tab.tms.labelNative }} <b>({{row.tms_tags.filter(a=>a.type ==='Native').length}})</b>
					</template>
					<div v-for="item in row.tms_tags" :key="item.ccmt" v-if="item.type ==='Native'">
					<div style="display:block;margin-top:15px;padding-left:10px;border-left:3px solid #409EFF;"><i class="el-icon-share" :style="{ color:(item.done ? 'green': 'red' ) }"></i> {{ item.hdlr }} - id: {{ item.ccmt}} <span v-if="item.ccmtn != null">- nom: {{ item.ccmtn }}</span></div>
						<div style="display:block;color:#409EFF;padding-left:10px;border-left:3px solid #409EFF;" v-if="item.url != ''"> >>{{ item.url}} </div>
						<pre  v-highlightjs><code class="javascript">{{ item.tag }}}</code></pre>
					</div>
				</el-collapse-item>

				<el-collapse-item name="3" v-if="row.tms_tags.filter(a=>a.type ==='JS').length > 0">
					<template slot="title">{{ i18n.tab.tms.labelJS }} <b>({{row.tms_tags.filter(a=>a.type ==='JS').length}})</b>
					</template>
					<div v-for="item in row.tms_tags" :key="item.ccmt" v-if="item.type ==='JS'">
					<div style="display:block;margin-top:15px;padding-left:10px;border-left:3px solid #409EFF;"><i class="el-icon-share" :style="{ color:(item.done ? 'green': 'red' ) }"></i> {{ item.hdlr }} - id: {{ item.ccmt}} <span v-if="item.ccmtn != null">- nom: {{ item.ccmtn }}</span></div>
						<div style="display:block;color:#409EFF;padding-left:10px;border-left:3px solid #409EFF;" v-if="item.url != ''"> >>{{item.url}} </div>
						<pre  v-highlightjs><code class="javascript">{{ item.tag }}</code></pre>
					</div>
				</el-collapse-item>
				<el-collapse-item name="4" v-if="row.tms_tags.filter(a=>a.type ==='cm').length > 0">
					<template slot="title">{{ i18n.tab.tms.labelCookieMatching }} <b>({{row.tms_tags.filter(a=>a.type ==='cm').length}})</b></template>
					<div v-for="item in row.tms_tags" :key="item.ccmt" v-if="item.type ==='cm'">
					<div style="display:block;margin-top:15px;padding-left:10px;border-left:3px solid #409EFF;"><i class="el-icon-share" :style="{ color:(item.done ? 'green': 'red' ) }"></i> {{ item.hdlr }} - id: {{ item.ccmt}} <span v-if="item.ccmtn != null">- nom: {{ item.ccmtn }}</span></div>
						<div style="display:block;color:#409EFF;padding-left:10px;border-left:3px solid #409EFF;" v-if="item.url != ''"> >>{{ item.url}} </div>
					</div>
				</el-collapse-item>
			</el-collapse>
		</el-tab-pane>

		<el-tab-pane :disabled="(row.nb_s2s > 0 ? false:true)">
		<span slot="label">{{ i18n.tab.s2s.name }} <el-badge class="mark" :value="(row.nb_s2s == 0 ? i18n.misc.empty :row.nb_s2s)"/></span>

				<div v-for="item in row.s2s_connectors" :key="item.dc">
				<div style="display:block;margin-top:15px;padding-left:10px;border-left:3px solid #409EFF;"><i class="el-icon-share" :style="{ color:(item.done ? 'green': 'red' ) }"></i> {{ item.mode }} - id: {{ item.dc}} <span v-if="item.dcn != ''">- nom: {{ item.dcn }}</span></div>
					<code v-if="item.mode==='RD' && item.url != false" style="overflow-wrap: break-word;font-family: Consolas;display:block;background: #efefef;color: #777; font-size:11px;border:1px solid #ebebeb;border-top:0px;border-left:3px solid #409EFF;padding:10px">{{ item.url }}</code>
				</div>

	</el-tab-pane>

		<el-tab-pane :label="i18n.tab.rawrequest.name">
			<code style=" overflow-x: auto;font-family: Consolas;display:block;background: #efefef;color: #777; font-size:11px;border:1px solid #ebebeb; padding:10px">{{row.rawcol}}</code>
			<h1>{{i18n.tab.rawrequest.labelHostResponse}}:</h1>
			<pre v-highlightjs><code class="javascript">{{row.response}}</code></pre>

			
		</el-tab-pane>
	</el-tabs>`,
	props: ["row", "i18n"]
};
const eaAnalyzer = {
	template:
		`<el-container>
<el-card class="box-card" style="min-height:450px;width:100%;">
			<div slot="header" class="ea-header">
				<span>EA_ANALYZER</span>

				<el-dropdown @command="handleCommand" style="justify-self:end;cursor:pointer;">
				  <span class="el-dropdown-link">
				    {{ (Object.keys(datalayer).length >0 ? i18n.toolbox.qaReady : i18n.toolbox.name) }} <i class="el-icon-arrow-down el-icon--right"></i>
				  </span>
				  <el-dropdown-menu slot="dropdown">
				    <!-- <el-dropdown-item command="removeDatalayer" v-if="Object.keys(datalayer).length >0">{{ i18n.toolbox.RmvDatalayer }}</el-dropdown-item>
				    <el-dropdown-item command="addDatalayer">{{ ( Object.keys(datalayer).length >0 ? i18n.toolbox.changeDatalayer : i18n.toolbox.loadDatalayer) }} </el-dropdown-item> -->
					<el-dropdown-item command="newtab_all">Ouvrir dans un nouvel onglet</el-dropdown-item>
					<el-dropdown-item command="formatcsv">{{i18n.toolbox.exportAll}}</el-dropdown-item>
				  </el-dropdown-menu>
				</el-dropdown>

				<el-switch
					style="display: block;justify-self: end;"
					v-model="silence"
					active-color="#13ce66"
					inactive-color="#ff4949"
					:active-text="i18n.notification.activate"
					:inactive-text="i18n.notification.deactivate">
				</el-switch>

			</div>

			<el-dialog
			  :title="i18n.qa.name"
			  :visible.sync="centerDialogVisible"
			  width="90%"
			  center>
			  <span><el-input
					  type="textarea"
					  :rows="5"
					  :placeholder="i18n.qa.placeholder"
					  v-model="datalayer_csv">
					</el-input></span>
				<span v-if="Object.keys(datalayer).length >0"><hr><h3>{{i18n.qa.part2}}</h3>{{datalayer}}</span>
			  <span slot="footer" class="dialog-footer">
			    <el-button @click="removeDatalayer()" :disabled="!datalayer_csv">{{i18n.misc.remove}}</el-button>
			    <el-button type="primary" @click="checkDatalayer()">{{i18n.misc.confirm}}</el-button>
			  </span>
			</el-dialog>

			<el-table size="mini" :data="items" ref="multipleTable">

				<el-table-column type="expand">
					<template slot-scope="props">
						<span v-if="props.row.type ==='site'">
							<inner-tabs  :row="props.row" :i18n="i18n"></inner-tabs>
						</span>
						<span v-else>
							<el-tabs type="border-card">
								<el-tab-pane>
									<span slot="label">{{ i18n.tab.overview.name }}</span>

									<div class="ea-params-grid" style="margin-bottom:10px;">
										<div class="grid-name">{{ i18n.tab.overview.labelTraffickingType }}:</div><div class="grid-value"><el-tag size="small">{{props.row.canal | getReadableChannel}}</el-tag></div>
									</div>
									<code style="font-family: Consolas;display:block;background: #efefef;color: #777; font-size:11px;border:1px solid #ebebeb; padding:10px">{{props.row.req[0].url}}</code>
											<el-table size="mini" :data="props.row.req[0].params" ref="yoyo">
												<el-table-column :label="i18n.table.header.name" ><template slot-scope="props">{{ props.row.name}}</template></el-table-column>
												<el-table-column width="400" :label="i18n.table.header.value"><template slot-scope="props">{{ props.row.value}}</template></el-table-column>
											</el-table>

									<hr style="display: block;height: 1px;border: 0;border-top: 1px solid #ccc;margin: 1em 0; padding: 0;">
								</el-tab-pane>
								<el-tab-pane>
									<span slot="label">{{ i18n.tab.browsinghistory.name }} <el-badge class="mark" :value="props.row.req.length"/></span>
									<el-collapse>
										<el-collapse-item v-for="(req, index) in props.row.req" :key="req.timestamp ">
											<template slot="title">{{ index + 1 }} - {{req.url.split('/')[2]}} <el-tag size="small">{{req.params.length + ' params'}}</el-tag></template>
											<code style="overflow-x: auto;font-family: Consolas;display:block;background: #efefef;color: #777; font-size:11px;border:1px solid #ebebeb; padding:10px">{{ req.url}}</code>
											<el-table size="mini" :data="req.params" ref="yoyo">
												<el-table-column :label="i18n.table.header.name" ><template slot-scope="props">{{ props.row.name}}</template></el-table-column>
												<el-table-column width="400" :label="i18n.table.header.value"><template slot-scope="props">{{ props.row.value}}</template></el-table-column>
											</el-table>
										</el-collapse-item>
									</el-collapse>
								</el-tab-pane>
							</el-tabs>	
						</span>
					</template>				
				</el-table-column>


				<el-table-column :label="i18n.table.header.type" width="100">
					<template slot-scope="props">
						<span v-if="props.row.type ==='ad'"><el-tag size="mini">{{props.row.corv}}</el-tag><el-tag size="mini">{{props.row.canal | getReadableChannel}}</el-tag></span>
						<span v-else><el-tag size="mini" :type="(props.row.response_status ? (props.row.firstparty ? 'success':'warning') : 'danger')">{{ (props.row.response_status ? (props.row.firstparty ? '1st':'3rd') : '!') }}</el-tag>&nbsp;<el-tag size="mini">{{ props.row.call_type }}</el-tag></span>
					</template>
				</el-table-column>


				<el-table-column :label="i18n.table.header.site">
					<template slot-scope="props">
						{{props.row.website}}
					</template>
				</el-table-column>



				<el-table-column width="300" :label="i18n.table.header.main">
				
					<template slot-scope="props">
						<span v-if="props.row.type ==='site'">{{props.row.page_url.split('?')[0]}}</span> <span v-else><b>support:</b> {{ props.row.pblish_name }}<br/><b>campagne:</b> {{ props.row.cmp_name }}</span>
					</template>
				</el-table-column>


				<el-table-column>
					<template slot-scope="props">
						<el-tooltip placement="left">
	 						<div slot="content" v-if="props.row.type ==='site'">{{props.row.time.ts | formatDateago}}</div>
	 						<div slot="content" v-else>{{props.row.req[0].timestamp | formatDateago}}</div>
	  						<el-button type="text" size="mini" style="cursor:help;" v-if="props.row.type ==='site'"><i class="el-icon-time" :style="{ color:(props.row.time.timeElapsed < 2000 ? '': (props.row.time.timeElapsed > 5000 ? 'red':'orange' ) ) }"></i><span :style="{ color:(props.row.time.timeElapsed < 2000 ? '': (props.row.time.timeElapsed > 5000 ? 'red':'orange' ) ) }">{{ (props.row.time.timeElapsed /1000).toFixed(2) }} s.</span></el-button>

	  						<el-button v-else type="text" size="mini" style="cursor:help"><i class="el-icon-time"></i> {{((props.row.req[0].timestamp - props.row.req[props.row.req.length-1].timestamp) / 1000).toFixed(2)}} s.<br><i class="el-icon-location"></i> {{ props.row.nb_redir}}</span></el-button>
						</el-tooltip>

					</template>
				</el-table-column>

				<el-table-column :render-header="renderPhaseHeader" width="100">
					<template slot-scope="props">
						<el-button-group>
							<el-button style="padding:7px;" size="mini" @click="remove(props)" icon="el-icon-delete" circle></el-button>
						</el-button-group>
					</template>
				</el-table-column>
				
			</el-table>

		</el-card></el-container>`,
	props: ["items", "datalayer", "datalayer_csv"],
	data() {
		return {
			centerDialogVisible: false,
			disclaimerdeleteall: false,
			silencia: data.bg.notif_permission,
			i18n: {}
		}
	},
	computed: {
		silence: {
			get() {
				return this.silencia;
			},
			set(val) {
				data.bg.notif_permission = val;
				this.silencia = val;
			}
		}
	},
	created() {
		this.i18n = {
			tab: {
				overview: {
					name: browser.i18n.getMessage("tab-overview-name"),
					labelTagtype: browser.i18n.getMessage("tab-overview-label-tagtype"),
					labelTraffickingType: browser.i18n.getMessage("tab-overview-label-traffickingtype"),
					labelCookie: browser.i18n.getMessage("tab-overview-label-cookie"),
					labelLogTime: browser.i18n.getMessage("tab-overview-label-logtime"),
					labelHostResponse: browser.i18n.getMessage("tab-overview-label-hostresponse"),
					labelAttribTrafic: browser.i18n.getMessage("tab-overview-label-attribtrafic"),
					labelTrackingDomain: browser.i18n.getMessage("tab-overview-label-trackingdomain"),
					labelTMS: browser.i18n.getMessage("tab-overview-label-tms"),
					labelS2S: browser.i18n.getMessage("tab-overview-label-s2s")
				},
				browsinghistory: {
					name: browser.i18n.getMessage("tab-browsinghistory-name")
				},
				parameters: {
					name: browser.i18n.getMessage("tab-parameters-name"),
					labelGeneral: browser.i18n.getMessage("tab-parameters-label-general"),
					labelSystem: browser.i18n.getMessage("tab-parameters-label-system"),
					labelProduct: browser.i18n.getMessage("tab-parameters-label-product"),
					labelContextFlag: browser.i18n.getMessage("tab-parameters-label-contextflag"),
					labelSearch: browser.i18n.getMessage("tab-parameters-label-search")
				},
				tms: {
					name: browser.i18n.getMessage("tab-tms-name"),
					labelNative: browser.i18n.getMessage("tab-tms-label-native"),
					labelJS: browser.i18n.getMessage("tab-tms-label-js"),
					labelIMG: browser.i18n.getMessage("tab-tms-label-img"),
					labelCookieMatching: browser.i18n.getMessage("tab-tms-label-cookiematching")
				},
				s2s: {
					name: browser.i18n.getMessage("tab-s2s-name")
				},
				rawrequest: {
					name: browser.i18n.getMessage("tab-rawrequest-name"),
					labelHostResponse: browser.i18n.getMessage("tab-rawrequest-label-hostresponse")
				}
			},
			table: {
				header: {
					type: browser.i18n.getMessage("table-header-type"),
					site: browser.i18n.getMessage("table-header-site"),
					main: browser.i18n.getMessage("table-header-main"),
					name: browser.i18n.getMessage("table-header-name"),
					value: browser.i18n.getMessage("table-header-val")
				}

			},
			notification: {
				activate: browser.i18n.getMessage("mode-notification"),
				deactivate: browser.i18n.getMessage("mode-silence")
			},
			qa: {
				name: browser.i18n.getMessage("qa-name"),
				part2: browser.i18n.getMessage("qa-content-part-alreadyloaded"),
				placeholder: browser.i18n.getMessage("qa-placeholder-textarea")
			},
			toolbox: {
				name: browser.i18n.getMessage("tb-toolbox"),
				loadDatalayer: browser.i18n.getMessage("tb-loaddatalayer"),
				RmvDatalayer: browser.i18n.getMessage("tb-removedatalayer"),
				changeDatalayer: browser.i18n.getMessage("tb-changedatalayer"),
				exportAll: browser.i18n.getMessage("tb-exportall"),
				removeAll: browser.i18n.getMessage("tb-removeall"),
				qaReady: browser.i18n.getMessage("tb-qaready")
			},
			message: {
				datalayerRemoved: browser.i18n.getMessage("msg-datalayerremoved"),
				datalayerAdded: browser.i18n.getMessage("msg-datalayeradded"),
				downloadstarted: browser.i18n.getMessage("msg-download"),
				allDeletedWarning: browser.i18n.getMessage("msg-deleteall"),
				nothingToDelete: browser.i18n.getMessage("msg-nothingtodelete"),
				datalayerError: browser.i18n.getMessage("msg-invalddatalayer"),
				datalayerPartiallySaved: ""/*used_directly_in_code*/
			},
			misc: {
				true: browser.i18n.getMessage("value-boolean-true"),
				false: browser.i18n.getMessage("value-boolean-false"),
				empty: browser.i18n.getMessage("value-empty"),
				confirm: browser.i18n.getMessage("value-validate"),
				remove: browser.i18n.getMessage("value-remove"),
				cancel: browser.i18n.getMessage("value-cancel")
			}
		}
	},
	methods: {
		renderPhaseHeader(createElement, { column, $index }) {
			return createElement('el-button',
				{
					on: { "click": this.onDeleteAll },
					attrs: { "size": "mini" }
				},
				browser.i18n.getMessage("value-remove"));
		},
		onDeleteAll() {
			if (!this.items.length) {
				this.$message({ showClose: true, message: this.i18n.message.nothingToDelete })
			} else {
				this.$confirm(this.i18n.message.allDeletedWarning, 'Warning',
					{
						confirmButtonText: this.i18n.misc.confirm,
						cancelButtonText: this.i18n.misc.cancel,
						type: 'warning'
					}).then(() => {

						browser.storage.local.get().then(items => {
							Object.keys(items).filter(item => !isNaN(item)).forEach(a => browser.storage.local.remove(a));
							this.$emit("remove");

							browser.browserAction.setBadgeText({ text: "" });
							this.$message({ type: 'success', showClose: true, message: 'Suppression réussie' });
						});
					});
			}
		},
		handleCommand(command) {
			if (command == "addDatalayer") { this.centerDialogVisible = true }
			else if (command == "removeDatalayer") { this.removeDatalayer() }
			else if (command == "newtab_all") { browser.tabs.create({ active: true, url: "popup.html" }) }
			else if (command == "formatcsv") {
				if (this.items.length > 0) {
					this.formatCSV(); this.$message({ showClose: true, message: this.i18n.message.downloadstarted });
				} else { this.$message({ showClose: true, message: this.i18n.message.nothingToDelete }) }
			}
		},
		remove(scope) {
			browser.storage.local.remove(scope.row.id.toString()).then(_ => this.$emit("remove", scope.row));
		},
		removeDatalayer() {
			browser.storage.local.remove("datalayer").then(this.datalayer = {});
			browser.storage.local.remove("datalayer_csv").then(this.datalayer_csv = "");
			this.$message({ showClose: true, message: this.i18n.message.datalayerRemoved });

		},
		checkDatalayer() {
			var dl_arr = this.datalayer_csv.split('\n').map(a => a.toLowerCase());

			if (dl_arr[0].split('	').length > 1) { var separator = '	' } else { var separator = ';' }
			var headers = dl_arr[0].split(separator);
			var dictionnary = {};
			headers.forEach(header => dictionnary[header] = []);
			var allowed = ['catégorie', 'devis', 'générique', 'produit', 'recherche', 'vente'];

			dl_arr.shift();
			dl_arr.forEach(function (line) {
				if (line.length) {

					var cells = line.split(separator);

					headers.forEach(function (header, index) {
						if (cells[index].length > 0) {
							dictionnary[header].push(cells[0]);
							console.log(dictionnary);
						}
					});
				}
			});


			var delta_removed = (Object.keys(restrictKeys(dictionnary, allowed)).length - Object.keys(dictionnary).length);


			if (Object.keys(restrictKeys(dictionnary, allowed)).length > 0) {

				this.$message({
					showClose: true,
					message: delta_removed < -1 ? browser.i18n.getMessage("msg-partialyvaliddatalayer", Object.keys(restrictKeys(dictionnary, allowed))) : this.i18n.message.datalayerAdded
				});
				this.datalayer = restrictKeys(dictionnary, allowed);
				browser.storage.local.set({ ['datalayer']: restrictKeys(dictionnary, allowed) });
				browser.storage.local.set({ ['datalayer_csv']: this.datalayer_csv });
				this.centerDialogVisible = false
			}
			else {
				this.$message({ showClose: true, message: this.i18n.message.datalayerError })
			}


		},
		formatCSV() {

			let csv = "";
			let data_csv = [];
			let forbidden_columns = ["snap", "response"];
			var csvheaders = [];

			var dL = this.datalayer;
			console.log("dl", dL);

			/* merge different other datasources to main datasource in order to complete requests' information */
			var result = this.items.filter(item => item.type === 'site').map(function (el) {
				var o = Object.assign({}, el);
				o['datalayer_cdc'] = dL[el.call_type.toLowerCase()] || "";

				if (o['datalayer_cdc'] !== "") {
					var params_arrays = o['params'].map(a => (a['flag'] !== 'system' ? a['nickname'] || a['name'] : '')).filter(a => a.length > 0);
					o['missing_params'] = o['datalayer_cdc'].filter(i => params_arrays.includes(i) === false);
				}
				return o;
			});

			/* loop on result to get the complete list of keys used */
			result.forEach(function (request) {
				csvheaders = csvheaders.concat(Object.keys(request));
			});

			/* dedupplicate csvheaders and remove forbidden_columns  */
			csvheaders = csvheaders
				.filter(function (elem, index, self) { return index == self.indexOf(elem) })
				.filter(header => forbidden_columns.includes(header) === false);

			/* Push data into data_csv if they match the csvheaders */
			result.forEach(function (request) {
				data_csv.push(restrictKeys(request, csvheaders));
			});

			// Get reverse chronological order
			data_csv.reverse();
			data_csv.forEach(i => {

				csv += Object.keys(i).map(function (k) {
					if (Array.isArray(i[k])) {
						let retreated_params = i[k].map(function (a) {
							if (typeof (a) === 'string') { return a }
							else if (typeof (a) === 'object') {
								if ('flag' in a) { return (a['flag'] === "system" ? a['flag'] + '-' : '') + a['name'] + ' => ' + a['value'] }
								else { return a['ccmt'] }
							}
						}).sort().join('\r\n');
						return `"${retreated_params}"`;
					}
					if (typeof i[k] === "object") {
						if (csvheaders.includes(k)) {
							let active_target = csvheaders.indexOf(k);
							csvheaders.splice(active_target, 1);
							Object.keys(i[k]).reverse().forEach(_key => csvheaders.splice(active_target, 0, _key));
						}
						return Object.values(i[k]).map(a => '"' + (isNaN(a) ? a : (parseInt(a) > 1000000 ? new Date(a).toISOString() : (a / 1000).toFixed(2))) + '"').join(';');
					}
					if (k === "response") { return } else { return `"${i[k]}"` }
				}).join(';') + '\r\n';
			});

			csv = csvheaders.map(i => '"' + i + '"').join(';') + '\r\n' + csv;

			browser.runtime.sendMessage({ csv: new Blob([csv], { type: "text/csv;charset=utf-8" }) });

		}
	},
	components: {
		innerTabs
	}
};
const login = {
	template: `<el-card>
					<div slot="header" class="clearfix">
					<span>Authentifiez-vous pour accéder au plugin !</span>
				</div>
			 	
				<el-form :inline="true" @submit.prevent.native>
					<el-form-item :model="user">
						<el-input v-model="user.id" @keyup.enter.native="login" placeholder="saisir mot de passe">
						<i class="el-icon-edit" slot="suffix"></i>
						</el-input>
					</el-form-item>
					<el-form-item>
    <el-button type="primary"  @click="login">Connexion</el-button>
  </el-form-item>
			  </el-form>
			</el-card>`,
	data() {
		return data;
	},
	methods: {
		login() {
			this.authentified = this.user.id === "fiatlux";
			bg.authentified = this.authentified;
		}
	}
}
new Vue({
	el: "#hugo",
	data,
	components: { eaAnalyzer, login },
	methods: {
		bgpage() {
			return chrome.extension.getBackgroundPage();
		},
		onRemove(row) {
			if (row) { this.items.splice(this.items.indexOf(row), 1) } else { this.items = [] }
			this.counterReset();
		},
		counterReset() {
			this.bg.clicks = this.items.length;
			browser.browserAction.setBadgeText({ text: (this.bg.clicks ? this.bg.clicks : "").toString() });
		}
	},
	created() {
		browser.storage.local.get().then(items => {
			console.log("test", Object.keys(items));
			console.log("test_result", Object.keys(items).filter(id => !isNaN(id)).sort(function (a, b) { var x = items[a].time.ts; var y = items[b].time.ts; return ((x > y) ? -1 : ((x < y) ? 1 : 0)); }));

			this.items = Object.keys(items).filter(id => !isNaN(id)).sort(function (a, b) { var x = items[a].time.ts; var y = items[b].time.ts; return ((x > y) ? -1 : ((x < y) ? 1 : 0)); }).map(id => items[id]);

			browser.browserAction.setBadgeText({ text: (this.bg.clicks ? this.bg.clicks : "").toString() });
			this.datalayer = items['datalayer'] || {};
			this.datalayer_csv = items['datalayer_csv'] || "";
			this.loading = false;
		});

	}
});

Vue.filter('formatDateago', function (value) {
	if (value) {
		var timezoneoffset = (new Date()).getTimezoneOffset() / 60;
		var tzdelta = timezoneoffset * 3600000;

		var value = new Date(value);
		var timeago = new Date(new Date() - (value - tzdelta));
		var ago_hours = timeago.getHours() - 1;
		var ago_minutes = timeago.getMinutes();
		var ago_secs = timeago.getSeconds();

		var date = value.getDate();
		var month = value.getMonth();
		var year = value.getFullYear();
		var time = value.getHours();
		var minutes = value.getMinutes();
		var secs = value.getSeconds();

		if (ago_hours > 0) { return browser.i18n.getMessage("time-ago", [ago_hours, ago_minutes, time, minutes, secs]) }
		else { return browser.i18n.getMessage("time-ago-less-than-one-hour", [ago_minutes, ago_secs, time, minutes, secs]) }
	}
});
Vue.filter('getReadableChannel', function (value) {
	var channel_mapping = {
		"esl": "SEM",
		"eml": "mailing",
		"ead": "display",
		"eaf": "affiliation",
		"esc": "social",
		"etf": "price comparator",
		"ept": "partner",
		"egn": "generical"
	}
	return channel_mapping[value];
});
Vue.filter('formatDate', function (value) {
	if (value) {
		var value = new Date(value);
		var date = value.getDate();
		var month = value.getMonth();
		var year = value.getFullYear();
		var time = value.getHours();
		var minutes = value.getMinutes();
		var secs = value.getSeconds();
		var msecs = value.getMilliseconds();

		return `${date}/${month}/${year} à ${time}:${minutes}:${secs}:${msecs}`;
	}
});
Vue.directive('highlightjs', {
	deep: true,
	bind: function (el, binding) {
		// on first bind, highlight all targets
		let targets = el.querySelectorAll('code')
		targets.forEach((target) => {
			// if a value is directly assigned to the directive, use this
			// instead of the element content.
			if (binding.value) {
				target.textContent = binding.value
			}
			hljs.highlightBlock(target)
		})
	},
	componentUpdated: function (el, binding) {
		// after an update, re-fill the content and then highlight
		let targets = el.querySelectorAll('code')
		targets.forEach((target) => {
			if (binding.value) {
				target.textContent = binding.value
				hljs.highlightBlock(target)
			}
		})
	}
});