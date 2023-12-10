# Project - Student Record System
## Introduction
Cloud Platform : Render
Database : Mongodb
## Getting Start
- URL : "https://srs-qiyp.onrender.com"
- Testing account1 -> Username: `s123456` & Password: `123456`
- Testing account2 -> Username: `s456789` & Password: `456789`

## Login/Logout
### Testing Login
#### Normal Flows - Login
1. Open the URL above to enter login page.
2. Select one account above for login.
3. If both `Username` and `Password` are correct, browser will jump to `/main` route instantly.
#### Exceptions
- Any exception below that causes login failure: 
1. The `Username` is not in the database.
2. The `Password` does not match `Username` in the database.
#### Successful Login
- Once login is successful, session will be create and record the `authenticated status` and `Username`.
```
req.session.authenticated : true,
req.session.username : <Username>
```
- while the session exist, users can skip the login page to ascess `/main`. 
- the session will stay until user logout.

### Testing Logout
#### Normal Flows - Logout
1. Press the "Logout" button on the bottom of main page.
<br/>OR
2. Type the URL with route `/logout`.
#### Successful Logout
- Once Logout is successful, session will be set as `null`.
- Login process is required to asscess main page after Logout.

## CRUD services
### Student Profile (UPDATE)
- There are two data can be update in this section: `Phone` AND `Email`.
- `Phone` with constraint of 8 digit number.
- `Email` is a String.
#### Normal Flows
1. Type the data in the input area.
2. Press "Update" to update the phone number.
#### Exceptions
- Any exception below that causes update failure:
1. `Phone` is not 8 digit number.
2. `Phone` or email is used by other user.
#### Successful Update
- New data will replace old data and be show in the main page.

### Emergency Contact (CREATE & DELETE)
- Create emergency contact by entering `Phone` and `Relation`.
- Maximum number of contact is 5.
- `Phone` with constraint of 8 digit number.
- `Relation` is a String.
#### Normal Flows (CREATE)
1. Type the phone and relation in the input area.
2. Press "Add" to create new contact.
#### Exceptions
- Any exception below that causes update failure:
1. Number of contact reaches 5
2. `Phone` is not 8 digit number.
3. `Phone` already exist in user contact table.
#### Successful Create
- New contact append to the contact table and show on main page.

#### Normal Flows (DELETE)
1. Type the phone in the input area
2. Press "Delete" to delete corresponding number.
#### Exceptions
- Any exception below that causes update failure:
2. `Phone` is not 8 digit number.
3. `Phone` does not exist in user contact table.
#### Successful Delete
- Input number delete from the contact table.

### Attendance (CREATE & READ)
- Create and read the table of attendance.
- Attendance will be shown as two status: `Taken` OR `Not Taken`
- Everytime access to `/main`, server will match the `Date` from database and return the attendance status.
#### Normal Flows (CREATE)
- Press the "Take Attendance" button.
#### Exceptions
1. Attendance alreay taken.
#### Successful Create
- `Date` will be record to database.
  
#### Normal Flows (READ)
1. Select a month from the select box.
2. Press "Search" to view the attendance of that month.
#### Successful Read
- Attendance record will be shown as table in the main page according condition.

## RESTful services
### POST
- API : 
```
https://srs-qiyp.onrender.com/:userid/contact
```
- `:userid` refer to username.
- Header and Data are required.
```
-H "Content-Type:application/json" -d '{"phone":"<input phone>", "relation":"<input relation>"}'
```
- Sample code for cURL:
```
curl -X POST https://srs-qiyp.onrender.com/s123456/contact -H "Content-Type:application/json" -d '{"phone":"12345678", "relation":"parent"}'
```
### GET
- API : 
```
https://srs-qiyp.onrender.com/:userid/profile
```
- `:userid` refer to username.
- Sample code for cURL: 
```
curl GET https://srs-qiyp.onrender.com/s123456/profile
```
### PUT
- API:
```
https://srs-qiyp.onrender.com/:userid/phone
```
- `:userid` refer to username.
- Header and Data are required.
```
-H "Content-Type:application/json" -d '{"phone":"<input phone>"}'
```
- Sample code for cURL:
```
curl -X PUT https://srs-qiyp.onrender.com/s123456/phone -H "Content-Type:application/json" -d '{"phone":"12345678"}'
```
### DELETE
- API:
```
https://srs-qiyp.onrender.com/:userid/contact/:phone
```
- `:userid` refer to username.
- `:phone` refer to contact user wants to delete.
- Sample code for cURL:
```
curl -X DELETE https://srs-qiyp.onrender.com/s123456/contact/12345678
```
