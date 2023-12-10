//setup
const express = require('express');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const session = require('cookie-session');
app.use(session({
	name : 'login-session',
	keys : ['login passport']
}));

const date = new Date();
var day = date.getDate();
var month = date.getMonth()+1;
var year = date.getFullYear();


//listen port
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


//mongodb
const {MongoClient} = require('mongodb');
const dbUrl = 'mongodb+srv://ktk10566:ktk10566@cluster0.mgewehr.mongodb.net/?retryWrites=true&w=majority';
const client = new MongoClient(dbUrl);
//---mongbdb collections
const account = client.db('s350').collection('accounts');
const student = client.db('s350').collection('students');
const teacher = client.db('s350').collection('teachers');
const program = client.db('s350').collection('programs');
const course = client.db('s350').collection('courses');
const cl = client.db('s350').collection('class');

//------------------------------------routes------------------------------------
//---default route
app.get('/', (req, res) => {
	if (req.session.authenticated == true) {
		res.redirect('/main');
	} else {
		res.redirect('/login');
	}
});

//---login
app.get('/login', (req, res) => {
	res.status(200).render('login');
});

app.post('/login', async(req, res) => {
	try{
		//find user
		await client.connect();
		var result = await account.findOne({userID:req.body.username});
		await client.close();
	} finally {
		if (result != null) {
			//match password
			if (req.body.password == result.userPW) {
				//session
				req.session.authenticated = true;
				req.session.username = result.userID;
				req.session.position = result.position;
				res.redirect('/');
			} else {
				res.status(200).render('message',{message:'Wrong Password'});
			}
		} else {
			res.status(200).render('message',{message:'User Not Found'});
		}	
	}
});

//---logout
app.get('/logout', (req, res) => {
	req.session = null;
	res.render('message',{message:'Logout'});
});
//---change pw
app.get('/changePW', (req,res)=>{
	res.status(200).render('changePW');
});
app.post('/changePW', async (req,res)=>{
	var id = req.body.id;
	var oPW = req.body.oPW;
	var nPW = req.body.nPW;
	
	await client.connect();
	var finduser = await account.findOne({userID:id});
	if(finduser==null){
		res.status(200).render('message',{message:"User Don't Exist"});
	} else if (oPW != finduser.userPW){
		res.status(200).render('message',{message:"Wrong Password"});
	} else if (oPW==nPW){
		res.status(200).render('message',{message:"New PW Is Same As Old PW"});
	} else {
		await account.updateOne({userID:id,userPW:oPW},{$set:{userPW:nPW}});
	}
	await client.close();
	res.status(200).render('message',{message:"Password Changed"});
});
//---forgot password
app.get('/getPW', (req,res)=>{
	res.status(200).render('getPW');
});
app.post('/getPW', async (req,res)=>{
	id = req.body.id;
	await client.connect();
	var finduser = await account.findOne({userID:id});
	var PW = finduser.userPW;
	await client.close();
	res.status(200).render('message',{message:"Your Password Is: " + PW});
});
//------------------------------------main------------------------------------
app.get('/main', async (req, res) => {
	if (req.session.authenticated == true) {
		req.session.authenticated = true;
		req.session.username = req.session.username
		req.session.position = req.session.position
	}
	switch(req.session.position){
		case "admin":
			try{
				await client.connect();
				readP = await program.find().sort({code:1}).toArray();
			} finally{
				await client.close();
			}
			res.status(200).render("main_a",{username:req.session.username,readP:readP});
			break;
			
		case "teacher":
			try{
				await client.connect();
				var result = await teacher.findOne({userID:req.session.username});
				var name = result.lName +' '+ result.fName;
				if (result.programleader) {
					var info = {
						'name':name,
						'pos':'pl'
					}
				} else if (result.courseleader) {
					var info = {
						'name':name,
						'pos':'cl'
					}
				} else {
					var info = {
						'name':name,
						'pos':'t'
					}
				}
			}finally{
				res.status(200).render("main_t",info);
				await client.close();
			}
			break;
			
		case "student":
			try {
				await client.connect();
				var profile = await student.findOne({userID:req.session.username});
				await client.close();
			} finally {
				//cheack for today's attendance
				req.session.attendance = false;
				for (var att of profile.attendance) {
					if ((day==att.day) && (month==att.month) && (year==att.year)) {
						req.session.attendance = true;
						break;
					} 
				}
				res.status(200).render('main_s',{
					profile : profile,
					contact : profile.contact,
					attendance : req.session.attendance,
					attShow : req.session.attShow
				});
			}
			break;
	}
});

//------------------------------------admin------------------------------------
app.post('/registerStudent', async (req, res) => {
	try{
		await client.connect();
		var check = await account.findOne({userID:req.body.userID});
		if (check!=null){
			res.status(200).render('message',{message:'This ID is occupied'});
		} else {
			await account.insertOne({
				userID:req.body.userID,
				userPW:"HKMU"+req.body.userID,
				position:"student"
			});
			await student.insertOne({
				userID:req.body.userID,
				fName:req.body.fName,
				lName:req.body.lName,
				birthDay:req.body.birthDay,
				phone:"",
				email:"",
				contact:[],
				attendance:[],
				program:req.body.program,
				class:[]
			});
			res.status(200).render('message',{message:'Registered'});
		}
	} finally {
		await client.close();
	}
});

app.post('/registerTeacher', async (req, res) => {
	try {
		await client.connect();
		var check = await account.findOne({userID:req.body.userID});
		if (check!=null){
			res.status(200).render('message',{message:'This ID is occupied'});
		} else {
			await account.insertOne({
				userID:req.body.userID,
				userPW:"HKMU"+req.body.userID,
				position:"teacher"
			});
			await teacher.insertOne({
				userID:req.body.userID,
				fName:req.body.fName,
				lName:req.body.lName,
				programleader:false,
				courseleader:false,
				teaching:0
			});
			res.status(200).render('message',{message:'Registered'});
		}
	} finally {
		await client.close();
	}
});


app.get('/Program', async (req, res) => {
	if (req.session.position == "admin"){
		await client.connect();
		var readT = await teacher.find({programleader:false,courseleader:false}).sort({userID:1}).toArray();
		res.status(200).render('Program',{readT:req.session.readT});
	} else {
		res.status(200).render('message',{message:"You Are Not Admin"});
	}
});

app.get('/readProgram', async (req, res) => {
	var readP = await program.find().sort({code:1}).toArray();
	res.status(200).render('readProgram',{'result':readP});
});

app.get('/AdminreadTeacher', async (req, res) => {
	var readT = await teacher.find({programleader:false,courseleader:false}).sort({userID:1}).toArray();
	res.status(200).render('readTeacher',{'result':readT});
});

app.post('/createProgram', async (req, res) => {
	var checkCN = true;
	var checkT = null;
	var readP = await program.find().sort({code:1}).toArray();
	var readT = await teacher.find({programleader:false,courseleader:false}).sort({userID:1}).toArray();
	for (var i of readP){
		if (req.body.code == i.code || req.body.name == i.name){
			checkCN = false;
		}
	}
	for (var j of readT){
		if (req.body.id == j.userID){
			checkT = true;
			break;
		} else {
			checkT = false;
		}
	}
	
	if (checkCN == false){
		res.status(200).render('message',{message:"Code or Name Is Existed"});
	} else if (checkT == false){
		res.status(200).render('message',{message:"Teacher Is Not Available"});
	} else {
		try{
			var doc = {
				code:req.body.code,
				name:req.body.name,
				leader:req.body.id
			};
			var find = {userID:req.body.id};
			var query = {$set:{programleader:true}};
			await program.insertOne(doc);
			await teacher.updateOne(find,query);
		} finally {
			await client.close();
			req.session.readT = null;
			res.redirect('/Program');
		}
	}
});

app.post('/changeProgramLeader', async (req, res) => {
	var checkC = false;
	var readP = await program.find().sort({code:1}).toArray();
	for (var i of readP){
		if (req.body.code == i.code){
			checkC = true;
			break;
		}
	}
	if (checkC) {
		try{
			var Program = await program.findOne({code:req.body.code});
			var oldL = Program.leader;
			await teacher.updateOne({userID:oldL},{$set:{programleader:false}});
			await teacher.updateOne({userID:req.body.id},{$set:{programleader:true}});
			await program.updateOne({code:req.body.code},{$set:{leader:req.body.id}});
		} finally {
			await client.close();
			req.session.readT = null;
			res.redirect('/Program');
		}
	} else {
		res.status(200).render('message',{message:"Program Not Exist"});
	}
});

//------------------------------------teacher------------------------------------
//------program leader
app.get('/Course', async (req, res) => {
		await client.connect();
		var checkPos = await teacher.findOne({userID:req.session.username});
		if (checkPos.programleader!=true){
			res.status(200).render('message',{message:"You Are Not Program Leader"});
		} else {
			var Program = await program.findOne({leader:req.session.username});
			var name = Program.name;
			req.session.pCode = Program.code
			var readT = await teacher.find({programleader:false,courseleader:false}).sort({userID:1}).toArray();
			res.status(200).render('Course',{name:name,readT:readT});
		}
});
app.get('/readCourse', async (req, res) => {
	var readC = await course.find({pCode:req.session.pCode }).sort({code:1}).toArray();
	res.status(200).render('readCourse',{'result':readC});
});
app.get('/PLreadTeacher', async (req, res) => {
	var readT = await teacher.find({programleader:false,courseleader:false}).sort({userID:1}).toArray();
	res.status(200).render('readTeacher',{'result':readT});
});

app.post('/createCourse', async (req, res) => {
	var checkCN = true;
	var checkT = null;
	var readC = await course.find({pCode:req.session.pCode }).sort({code:1}).toArray();
	var readT = await teacher.find({programleader:false,courseleader:false}).sort({userID:1}).toArray();
	for (var i of readC){
		if (req.body.code == i.code || req.body.name == i.name){
			checkCN = false;
		}
	}
	for (var j of readT){
		if (req.body.id == j.userID){
			checkT = true;
			break;
		} else {
			checkT = false;
		}
	}
	
	if (checkCN == false){
		res.status(200).render('message',{message:"Code or Name Is Existed"});
	} else if (checkT == false){
		res.status(200).render('message',{message:"Teacher Is Not Available"});
	} else {
		try{
			var doc = {
				pCode:req.session.pCode,
				code:req.body.code,
				name:req.body.name,
				leader:req.body.id
			};
			var find = {userID:req.body.id};
			var query = {$set:{courseleader:true}};

			await course.insertOne(doc);
			await teacher.updateOne(find,query);
		} finally {
			await client.close();
			res.redirect('/Course');
		}
	}
});
app.post('/changeCourseLeader', async (req, res) => {
	var checkC = false;
	var readC = await course.find({pCode:req.session.pCode }).sort({code:1}).toArray();
	for (var i of readC){
		if (req.body.code == i.code){
			checkC = true;
			break;
		}
	}
	if (checkC) {
		try{
			var Course = await course.findOne({code:req.body.code});
			var oldL = Course.leader;
			await teacher.updateOne({userID:oldL},{$set:{courseleader:false}});
			await teacher.updateOne({userID:req.body.id},{$set:{courseleader:true}});
			await course.updateOne({code:req.body.code},{$set:{leader:req.body.id}});
		} finally {
			await client.close();
			res.redirect('/Course');
		}
	} else {
		res.status(200).render('message',{message:"Course Not Exist"});
	}
});
//------course leader
app.get('/Class', async (req, res) => {

		await client.connect();
		var checkPos = await teacher.findOne({userID:req.session.username});
		if (checkPos.courseleader!=true){
			res.status(200).render('message',{message:"You Are Not Course Leader"});
		} else {
			var Course = await course.findOne({leader:req.session.username});
			var name = Course.name;
			req.session.pCode = Course.pCode
			req.session.cCode = Course.code
			var readT = await teacher.find({teaching:{$lt:3}}).sort({userID:1}).toArray();
			res.status(200).render('Class',{name:name,readT:readT});
		}

});
app.get('/readClass',  async (req, res) => {

	var readCL = await cl.find({cCode:req.session.cCode }).sort({code:1}).toArray();

	res.status(200).render('readClass',{'result':readCL});
});
app.get('/CLreadTeacher', async (req, res) => {

	var readT = await teacher.find({teaching:{$lt:3}}).sort({userID:1}).toArray();

	res.status(200).render('readTeacher',{'result':readT});
});

app.post('/createClass', async(req, res) => {

	var readCL = await cl.find({cCode:req.session.cCode }).sort({code:1}).toArray();
	if (readCL.length >= 5){
		res.status(200).render('message',{message:'Reach Limit(Max Class: 5)'});
	} else {
		try{
			var doc = {
				pCode:req.session.pCode,
				cCode:req.session.cCode,
				code:"CL"+(readCL.length+1),
				teacher:req.body.id,
				count:0
			}
			await cl.insertOne(doc);
			await teacher.updateOne({userID:req.body.id},{$inc:{teaching:1}});
		} finally {
			await client.close();
			res.redirect('/Class');
		}
	}
});
app.post('/deleteClass', async(req, res) => {

	var readCL = await cl.find({cCode:req.session.cCode }).sort({code:1}).toArray();
	var l = readCL.length;
	if (l == 0){
	} else {
		var code = 'CL'+l;
		var id = readCL[l-1].teacher;
		var pC = req.session.pCode;
		var cC = req.session.cCode;
		try{
			await cl.deleteOne({'pCode':pC,'cCode':cC,'code':code});
			await teacher.updateOne({userID:id},{$inc:{teaching:-1}});
			await student.updateMany({},{$pull:{class:{pCode:pC,cCode:cC,code:code}}});
		}finally{
			await client.close();
			res.redirect('/Class');
		}
	}
});
app.get('/Enroll', async(req, res) => {
		await client.connect();
		var checkPos = await teacher.findOne({userID:req.session.username});
		if (checkPos.courseleader!=true){
			res.status(200).render('message',{message:"You Are Not Course Leader"});
		} else {
			var Course = await course.findOne({leader:req.session.username});
			var name = Course.name;
			req.session.pCode = Course.pCode
			req.session.cCode = Course.code
			var readCL = await cl.find({cCode:req.session.cCode }).sort({code:1}).toArray();
			var readS = await student.find({program:Course.pCode,'class.cCode':{$ne:Course.code}}).sort({userID:1}).toArray();
			res.status(200).render('Enroll',{name:name,readCL:readCL,readS:readS});
		}
});


app.post('/Enroll', async(req, res) => {
try{
	var CL = req.body.class;
	var st = req.body.student;
	var doc = {$push:{class:{pCode:req.session.pCode, cCode:req.session.cCode, code:CL, score:null}}};
	if(CL==null){
		res.status(200).render('message',{message:"No Class"});
	}else if(typeof st == 'string'){
		await student.updateOne({userID:st},doc);
		await cl.updateOne({pCode:req.session.pCode,cCode:req.session.cCode,code:CL},{$inc:{count:1}});
		res.redirect('/');
	} else if (st == null){
		res.status(200).render('message',{message:"No Student"});
	} else {
		for (var s of st){
			await student.updateOne({userID:s},doc);
			await cl.updateOne({pCode:req.session.pCode,cCode:req.session.cCode,code:CL},{$inc:{count:1}});
		}
		res.redirect('/');
	}
}finally{
	await client.close();
}
});


//------ohter
app.get('/viewStudent', async (req, res) => {
	try{
		await client.connect();
		req.session.readCL = await cl.find({teacher:req.session.username}).sort({code:1}).toArray();
	}finally{
		res.status(200).render('viewStudent',{readCL:req.session.readCL});
	}
});
app.get('/viewStudent/:pC/:cC/:c', async (req, res) => {
	var pCode = req.params.pC;
	var cCode = req.params.cC;
	var code = req.params.c;
	var doc = {
		"class.pCode":pCode,
		"class.cCode":cCode,
		"class.code":code
	};
	var result = await student.find(doc).sort({userID:1}).toArray();
	res.status(200).render('viewing',{result:result,pCode:pCode,cCode:cCode,code:code});
});
app.post('/score/:pC/:cC/:c', async(req, res) => {
	var pC = req.params.pC;
	var cC = req.params.cC;
	var c = req.params.c;
	if (req.body.id == ""){
	}else if (typeof req.body.id == "string"){
		var find = {userID:req.body.id,
			'class.pCode':pC,
			'class.cCode':cC,
			'class.code':c
		};
		var doc = {$set:{'class.$.score':req.body.score}};
		await student.updateOne(find,doc);
	} else {
		for (st of req.body.id){
			if (st == ""){
			}else{
				var find = {userID:st,
					'class.pCode':pC,
					'class.cCode':cC,
					'class.code':c
				};
				var doc = {$set:{'class.$.score':req.body.score}};
				await student.updateOne(find,doc);
			}
		}
	}
	await client.close();
	var url = '/viewStudent/'+pC+'/'+cC+'/'+c
	res.redirect(url);
});
app.get('/vsBack', async (req,res)=>{
	await client.close();
	res.redirect('/');
});

//------------------------------------student------------------------------------

app.post('/stviewscore', async (req, res) => {
	await client.connect();
	var result = await student.findOne({userID:req.session.username});
	await client.close();
	res.status(200).render('stviewscore',{result:result});
});
//------update phone
app.post('/newphone', async (req, res) => {
	try{
		await client.connect();
		//check if phone number is used
		var check = await student.findOne({ phone : req.body.phone });
		if (check != null) {
			res.render('message',{message:'Failed : Number Existed'});
		} else {
			var find = { userID : req.session.username };
			var set = { $set : { phone : req.body.phone } };
			//update
			await student.updateOne(find, set);
			res.render('message',{message:'Phone Updated'});
		}
	} finally {
		await client.close();
	}
});

//------update email
app.post('/newemail', async (req, res) => {
	try{
		await client.connect();
		//check if email is used
		var email = req.body.email + '@' + req.body.domain
		var check = await student.findOne({ email : email });
		if (check != null) {
			res.render('message',{message:'Failed : Email Existed'});
		} else {
			var find = { userID : req.session.username };
			var set = { $set : { email : email } };
			//update
			await student.updateOne(find, set);
			res.render('message',{message:'Email Updated'});
		}
	} finally {
		await client.close();
	}
});

//------create contact
app.post('/addcontact', async (req, res) => {
	try{
		await client.connect();
		var profile = await student.findOne({userID:req.session.username});
		var contact = profile.contact;
		
		//can only create contacts up to 5
		if (contact.length >= 5) {
			res.render('message',{message:'Failed : Reach Limit'});
		} else {
			//check if number already exist
			for(var object of contact) {
				if (object.phone == req.body.phone){
					res.render('message',{message:'Failed : Number Exist'});
					break;
				}
			}
			//check if it is student's phone number
			if (req.body.phone == profile.phone) {
				res.render('message',{message:'Failed : This is your number'});
			} else {
				var find = {userID:req.session.username};
				var doc = {
					phone : req.body.phone,
					relation : req.body.relation
				};
				//create
				await student.updateOne(find,{$push:{contact:doc}});
				res.render('message',{message:'Contact Created'});
			}
		}
	} finally {
		await client.close();
	}
});

//------delete contact
app.post('/delcontact', async (req, res) => {
	try{
		await client.connect();
		//check if number exist
		var profile = await student.findOne({'userID':req.session.username});
		for (var object of profile.contact){
			//delete by phone number
			if (object.phone == req.body.phone){
				var status = true;
				var find = {userID:req.session.username};
				var doc = {$pull:{"contact":{"phone":req.body.phone}}};
				await student.updateOne(find,doc);
				res.render('message',{message:'Contact Deleted'});
				break;
			}
		}
		if (!status){
			res.render('message',{message:'Contact Not Exist'})
		}
	} finally {
		await client.close();
	}
});

//------create attendance
app.post('/takeatt', async (req, res) => {
	try{

		await client.connect();
		if (req.session.attendance == false){	
			var find = {userID : req.session.username}
			var doc = {
				day : day,
				month : month,
				year : year
			};
			await student.updateOne(find,{$push:{attendance:doc}});
			res.render('message',{message:'Attendance Taken'});
		} else {
			res.render('message',{message:'Already Taken'});
		}
	} finally {
		await client.close();
	}
});

//------read attendance
app.post('/readatt', async (req, res) => {
	try {
		await client.connect();
		var value = req.body.month;
		var profile = await student.findOne({userID:req.session.username});
		var attendance = profile.attendance;
		var result = [];
		if(value==''){
			for (var att of attendance) {
				if (att.year == year){
					result.push(att);
				}
			}
		} else {
			for (var att of attendance) {
				if (att.year == year && att.month == value){
					result.push(att);
				}
			}
		}
	} finally {
		await client.close();
		req.session.attShow = result;
		res.redirect('/');
	}
});
