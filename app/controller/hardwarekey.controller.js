// const baseUrl = process.env.BASE_URL.trim()
// const APP_ID = baseUrl.substr(0, baseUrl.length - 1);
const Hardwarekey = require('../model/hardwarekey.model');
const User = require('../model/user.model');
const Handel = require('../model/handel.model');

let sessData = {};
exports.registerSession = async (req, res) => {
    try{
        const payload = req.body;
        const userexists = await userExists(payload.title, req.user.id);
        const getuser = await Hardwarekey.findOne({title: payload.title, user: req.user.id, id: sessData.id});
        // console.log(getuser)
        if(userexists && getuser && getuser.registrationComplete){
            res.status(400).send({'status': 'false', 'message': 'Title already exists!'});
        }else{
            await deleteUser(payload.title, req.user.id);
            payload.id = generateRandomBuffer(32).toBase64({ alphabet: 'base64url', omitPadding: true });
            payload.credentials = [];
            const user = await addUser(payload.title, payload, req.user.id);
            console.log(user);
            sessData = req.session;
            sessData.title = payload.title;
            sessData.user = req.user.id;
            sessData.id = payload.id;
            res.send({'status': 'startFIDOEnrolment'});
        }
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}
exports.register = async (req, res) => {
    try{
        if(!sessData.title){
            res.status(400).send({'status': 'failed', 'message': 'Access denied!'});
            return;
        }
        const user = await getUser(sessData.title, sessData.user);
        const userData = await User.findOne({_id: sessData.user});
        sessData.challenge = generateRandomBuffer(32).toBase64({ alphabet: 'base64url', omitPadding: true });
        const publicKey = {
            challenge: sessData.challenge,
            'rp': {
                'name': 'Operation Privacy'
            },
            'user': {
                'id': user.id,
                'name': userData.email,
                'displayName': userData.name
            },
            'pubKeyCredParams': [
                { 'type': 'public-key', 'alg': -7   },
                { 'type': 'public-key', 'alg': -257 },
            ],
            'attestation': 'direct'
        };
        if(req.body.options) {
            const options = req.body.options
            if(!publicKey.authenticatorSelection)
                publicKey.authenticatorSelection = {};

            if(options.attestation)
                publicKey.attestation = options.attestation;

            if(options.rpId)
                publicKey.rp.id = options.rpId;

            if(options.uv)
                publicKey.authenticatorSelection.userVerification = 'required';
        }

        if(sessData.rk) {
            if(!publicKey.authenticatorSelection)
                publicKey.authenticatorSelection = {};

            publicKey.authenticatorSelection.requireResidentKey = true;
        }
        const hardwarekey = await Hardwarekey.find({user: req.user.id, registrationComplete:true});
        res.send({publicKey:publicKey, hardwarekey:hardwarekey});
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}

exports.verify = async (req, res) => {
    try{
        const payload = req.body;

        if(!sessData.title){
            return res.status(400).send({'status': 'false', message:'Access denied!', 'errorMessage': 'Access denied!'});
        }
        const user = await getUser(sessData.title, sessData.user);
        const cr = user.credentials;
        cr.push(payload.id);
        const updateData = {
            registrationComplete: true,
            credentials: cr, 
            aaguid: payload.aaguid
        };
        const updateuser = await updateUser(sessData.title, sessData.user, updateData);
        if(updateuser.registrationComplete){
            await User.updateOne({_id: sessData.user}, {hardwarekey: 'true'});
        }
        console.log(updateuser)
        sessData = {};
        res.send({'status': 'ok'});
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};

exports.loginSession = async (req, res) => {
    try{
        const payload = req.body
        const userexit = await userExists(payload.title, payload.user)
        if(!userexit){
            res.status(400).send({status: 'error', message: 'Wrong username or password!'});
            return;
        }else{
            sessData.title = payload.title;
            sessData.user = payload.user;
        }
        sessData.challenge = generateRandomBuffer(32).toBase64({ alphabet: 'base64url', omitPadding: true });
        const publicKey = {
            'challenge': sessData.challenge,
            'status': 'ok'
        }
        let user = await getUser(sessData.title, sessData.user);
        console.log(user);
        publicKey.allowCredentials = user.credentials.map((credId) => {
            return { 'type': 'public-key', 'id': credId }
        })
        
        if(sessData.rk) {
            delete publicKey.allowCredentials
        }

        if(sessData.uv) {
            publicKey.userVerification = 'required';
        }
        res.send(publicKey);
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}

function preformatGetAssertReq (getAssert) {
    getAssert.challenge = Uint8Array.fromBase64(getAssert.challenge, { alphabet: 'base64url' })
    if (getAssert.allowCredentials) {
      for (let allowCred of getAssert.allowCredentials) {
        allowCred.id = Uint8Array.fromBase64(allowCred.id, { alphabet: 'base64url' })
      }
    }
    return getAssert
  }

exports.login = async (req, res) => {
    try{
        const payload = req.body
        const userwhere = sessData.user
        const checkHandel = await getUserByUserHandle(payload.response.userHandle, userwhere);
        if(!sessData.title && !checkHandel){
            res.status(400).send({'status': 'false', message: 'Something is wrong!'});
        }else{
            sessData = {};
            res.send({'status': 'true'});
        }
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}

exports.getKey = async (req, res) => {
    try{
        const harewarekeys = await Hardwarekey.find({user:req.user.id, registrationComplete: true});
        res.send({status:'true', message:'hardware key list!', data:harewarekeys});
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}
exports.delete = async (req, res) => {
    try{
        const harewarekey = await Hardwarekey.findOne({_id: req.body.id});
        if(harewarekey){
            await Handel.deleteOne({username: harewarekey.title, user: harewarekey.user});
            await harewarekey.deleteOne()
        }
        const harewarekeys = await Hardwarekey.findOne({user:req.user.id, registrationComplete: true});
        if(!harewarekeys){
            await User.updateOne({_id: req.user.id}, {hardwarekey: 'false'});
        }
        res.send({status:'true', message:'hardware key deleted!', data:[]});
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}

async function getUserByUserHandle(userHandle, userwhere) {
    try {
        const user = await Handel.findOne({id:userHandle});
        if(user){
            userwhere.title = user.username;
            let userJSON = Hardwarekey.findOne(userwhere);
            if(!userJSON)
                throw new Error(`Username "${user.username}" does not exist!`);

            return userJSON;
        }else{
            return false;
        }
    } catch(e) {
        return {}
    }
};

function generateRandomBuffer(length = 32) {
    return crypto.getRandomValues(new Uint8Array(length));
}

async function addUser(username, struct, user){
    var handel = await Handel.create({id:struct.id, username:username, user:user});
    sessData.handelId = handel._id
    struct.user = user
    await Hardwarekey.create(struct);
    return true;
}

async function deleteUser(title, user){
    await Hardwarekey.deleteOne({title: title, user: user});
    return true;
}

async function userExists(title, user) {
    const foundUser = await Hardwarekey.findOne({title: title, user: user});
    if(!foundUser){
        return false;
    }
    return true;
};

async function getUser(title, user){
    const foundUser = await Hardwarekey.findOne({title: title, user: user});
    if(foundUser){
        return foundUser;
    }else{
        return false;
    }
};

async function updateUser(title, user, struct){
    console.log("=====================================================")
    console.log("session title => "+title)
    console.log("session user => "+user)
    console.log(struct)
    const foundUser = await Hardwarekey.findOne({title: title, user: user});
    if(foundUser){
        foundUser.registrationComplete = struct.registrationComplete;
        foundUser.credentials = struct.credentials;
        foundUser.aaguid = struct.aaguid;
        await foundUser.save();
        // var user2 = await Hardwarekey.updateOne({ title: title, user: user}, struct);
        return foundUser;
    }else{
        return false;
    }
};
