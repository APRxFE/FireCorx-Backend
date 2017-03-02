var Rx = require('rxjs/Rx')
var firebase = require('firebase')
var admin = require("firebase-admin")

exports.init = (databaseURL, serviceAccount) => {
	var config = {
		databaseURL: databaseURL,
		credential: admin.credential.cert(serviceAccount)
	}
	admin.initializeApp(config)
}

var at = () => firebase.database['ServerValue'].TIMESTAMP
var auth = () => admin.auth()
var rdb = () => admin.database()

var rootRef = () => rdb().ref()
var ref = (path) => rootRef().child(path)

exports.at = at
exports.auth = auth
exports.rdb = rdb
exports.rootRef = rootRef
exports.ref = ref

var ArrToObj = (Arr) => {
	let _ = {}; if(!Array.isArray(Arr) || Arr.length === 0) return _;
	Arr.forEach(kv => { _[kv[0]] = kv[1] })
	return _
}

exports.ArrToObj = ArrToObj

var parseStOp = (St, acRx) => St.map(_ => ({ key: _.key, val: _.val(), at: at() })).mergeMap(acRx)

var log = (val) => console.log(val)

exports.updateOnRn = (path, changeRx, removeRx) => {
	let _ref = ref(path)
	let changeSt = new Rx.Subject()
	let removeSt = new Rx.Subject()

	let change$ = parseStOp(changeSt, changeRx)
	let remove$ = parseStOp(removeSt, removeRx)

	let add = _ref.orderByValue().equalTo(true).on('child_added', _ => changeSt.next(_))
	let change = _ref.orderByValue().equalTo(true).on('child_changed', _ => changeSt.next(_))
	let remove = _ref.on('child_removed', _ => removeSt.next(_))

	return change$.merge(remove$).filter(_=>!!(_))
		.do(log)
		.mergeMap(_ => Rx.Observable.fromPromise(rootRef().update(_)))
}