
import {Natives} from '/extension/js/modules/natives.js';
import { Storage } from '/extension/js/modules/storage.js';
import DIDMethods from '/extension/js/did-methods/config.js';
import CryptoUtils from '/extension/js/modules/crypto-utils.js';
import '/extension/js/did-methods/ion/ion.js';

let PeerModel = {
  permissions: {}
};

let createConnection = (uri, options) => {
  let entry = JSON.parse(JSON.stringify(PeerModel));
  entry.id = uri;
  return entry;
}

var testKey = {
  "kty": "EC",
  "crv": "P-256",
  "x": "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
  "y": "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0",
  "d": "jpsQnnGQmL-YBIffH1136cspYG6-0iY7X1fCE9-E9LI"
}

const jwsHeader = {
  alg: 'EdDSA',
  typ: 'JWT'
};

async function getMethod(method){
  return (await import(`../did-methods/${method}/index.js`)).default
}

let DID = {
  supportedMethods: Object.keys(DIDMethods.supportedMethods),
  async create (options = {}){
    let module = await getMethod(options.method || 'ion');
    let did = await module.create();
    if (options.persona) did.persona = options.persona.trim();
    if (options.icon) did.icon = options.icon;
    await Storage.set('dids', did);
    return did;
  },
  async createPeerDID (uri, options = {}){
    // let { protocol, pathname } = new URL(uri);
    // uri = protocol + pathname;
    let entry = await Storage.get('connections', uri) || createConnection(uri);
    if (entry.did) {
      return entry;
    }
    entry.did = (await this.create(options.method)).id;
    await Storage.set('connections', entry);
    return entry;
  },
  async get(didUri){
    return Storage.find('dids', [
      ['equivalentIds', 'INCLUDES', didUri]
    ]).then(rows => rows[0])
  },
  async getPersonas(){
    return Storage.find('dids', did => !!did.persona)
  },
  async getConnection (uri, options = {}){
    return await Storage.get('connections', uri);
  },
  async setConnection (obj){
    await Storage.set('connections', obj);
  },
  async updateConnection (uri, obj){
    return await Storage.modify('connections', uri, (entry, exists) => {
      Natives.merge(entry, exists ? entry : createConnection(uri), obj);
    });
  },
  async resolve(didUri){
    let method = await getMethod(didUri.split(':')[1]);
    return method.resolve(didUri);
  },
  async sign(didUri, message){
    let did = await this.get(didUri);
    let method = await getMethod(didUri.split(':')[1] || 'ion');
    return method.sign(did.keys.signing.privateJwk, message);
  },
  async verify(publicKey, message, signature){
    //let did = this.resolve(didUri);
    // switch (did.curve) {
    //   case 'Ed25519':
        let utils = await CryptoUtils;

        console.log()
        return utils.nacl.sign.detached.verify(
          utils.base58.decode(message),
          utils.base58.decode(signature),
          utils.base58.decode(publicKey)
        );
    //   case 'P-256':         
    //     let crypt = new Jose.WebCryptographer();
    //     crypt.setContentSignAlgorithm("ES256");
    //     var signer = new Jose.JoseJWS.Signer(crypt);
    //     return await signer.addSigner(testKey).then(async () => await signer.sign(message, null, {}));
    // }
  }
}

export { DID };