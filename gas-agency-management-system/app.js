require("dotenv").config();

const express = require("express");

const bodyParser = require("body-parser");

const ejs = require("ejs");

const mysql = require("mysql");

const nodemailer = require("nodemailer");

const session = require("express-session");

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    }
});

function sendMail(mailOptions) {
    transporter.sendMail(mailOptions, function(err, data) {
        if (err)
            console.log(err);
        else {
            console.log("Email Sent");
        }
    });
}

const app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
}));

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    multipleStatements: true
});

con.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected to Database");
    }
});

const db_query = "CREATE DATABASE IF NOT EXISTS gas_agency;";

con.query(db_query, (err) => {
    if (err)
        console.log(err);
    else
        console.log("Database Created Successfully");
});

con.query("USE gas_agency", (err) => {
    if (err)
        console.log(err);
    else
        console.log("Database Changed");
});

const cus_table = "CREATE TABLE IF NOT EXISTS customers(cid int PRIMARY KEY, fname varchar(20), lname varchar(10), addr varchar(30), pin int, phone  bigint, email varchar(30), pass varchar(20), reg date, lob date)";
con.query(cus_table, (err) => {
    if (err)
        console.log(err);
    else
        console.log("Customers Table Created Successfully");
});

const ord_table = "CREATE TABLE IF NOT EXISTS orders(oid INT PRIMARY KEY AUTO_INCREMENT,cid INT,date DATE,time TIME,amount int,status varchar(20),FOREIGN KEY (cid) REFERENCES customers(cid))";

const detail_table = "CREATE TABLE IF NOT EXISTS details(price INT, stock INT);";

const admin_table = "CREATE TABLE IF NOT EXISTS admin(aid INT PRIMARY KEY, pass VARCHAR(20));";

con.query(admin_table, (err) => {
    if (err)
        console.log(err);
    else
        console.log("Admin Table Created Successfully");
});

con.query(ord_table, (err) => {
    if (err)
        console.log(err);
    else
        console.log("Orders Table Created Successfully");
});

con.query(detail_table, (err) => {
    if (err)
        console.log(err);
    else
        console.log("Details Table Created Successfully");
});

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/userlogin", (req, res) => {
    if (req.session.loggedin && req.session.cid) {
        res.redirect("/consumerdashboard" + req.session.cid);
    } else {
        res.render("Userlogin", {
            fail: ""
        });
    }
});

app.post("/userlogin", (req, res) => {
    const cid = req.body.userid;
    const pass = req.body.password;

    const pass_query = "SELECT cid,pass FROM customers WHERE cid = " + cid + "";
    con.query(pass_query, (err, results) => {
        if (err || results.length == 0) {
            console.log(err);
            res.render("Userlogin", {
                fail: "fail"
            });
        } else {
            results.forEach((result) => {
                if (pass == result.pass) {
                    req.session.loggedin = true;
                    req.session.cid = cid;
                    res.redirect("/consumerdashboard" + result.cid);
                } else {
                    res.render("Userlogin", {
                        fail: "fail"
                    });
                }

            });
        }
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err)
            console.log(err);
        else
            res.redirect("/");
    });
});

app.get("/signup", (req, res) => {
    var temp_cid;
    const cid_retrieve = "SELECT cid FROM customers ORDER BY cid DESC limit 1";
    con.query(cid_retrieve, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            if (result.length == 0) {
                temp_cid = 101;

            } else {
                result.forEach((row) => {
                    temp_cid = row.cid + 1;
                });
            }
            res.render("signup", {
                temp_cid: temp_cid
            });
        }
    });
});

app.post("/signup", (req, res) => {
    const cid = req.body.cusid;
    const fname = req.body.fname;
    const lname = req.body.lname;
    const addr = req.body.address;
    const pin = req.body.pincode;
    const mobile = req.body.mobile;
    const email = req.body.email;
    const pass = req.body.password;

    const date_obj = new Date();
    const cur_date = date_obj.getFullYear() + "-" + (date_obj.getMonth() + 1) + "-" + date_obj.getDate();
    const insCus = "INSERT INTO customers VALUES(" + cid + ",'" + fname + "','" + lname + "','" + addr + "'," + pin + "," + mobile + ",'" + email + "','" + pass + "','" + cur_date + "','0000-00-00')";
    con.query(insCus, (err) => {
        if (err)
            console.log(err);
        else {
            console.log("Inserted Record Into Customer table");
            if (req.session.loggedin) {
                req.session.destroy((err) => {
                    if (err)
                        console.log(err);
                });
            }
            res.redirect("/userlogin");
        }
    });

});

app.get("/adminlogin", (req, res) => {
    if (req.session.loggedin && req.session.aid) {
        res.redirect("/admindashboard");
    } else {
        res.render("adminlogin", {
            fail: ""
        });
    }
});

app.post("/adminlogin", (req, res) => {
    const adminid = req.body.adminid;
    const pass = req.body.password;

    const pass_query = "SELECT aid,pass FROM admin WHERE aid = " + adminid + "";
    con.query(pass_query, (err, results) => {
        if (err || results.length == 0) {
            console.log(err);
            res.render("adminlogin", {
                fail: "fail"
            });
        } else {
            results.forEach((result) => {
                if (pass == result.pass) {
                    req.session.loggedin = true;
                    req.session.aid = adminid;
                    res.redirect("/admindashboard");
                } else {
                    res.render("adminlogin", {
                        fail: "fail"
                    });
                }
            });
        }
    });
});

app.get("/admindashboard", (req, res) => {
    const tot_cus = "SELECT COUNT(*) AS tot_customers FROM customers; SELECT COUNT(*) AS pending FROM orders WHERE status LIKE 'Pending'; SELECT stock FROM details; SELECT COUNT(*) AS out_for_delivery FROM orders WHERE status LIKE 'Out for Delivery'; SELECT COUNT(*) AS delivered FROM orders WHERE status LIKE 'Delivered';";

    if (req.session.loggedin && req.session.aid) {

        con.query(tot_cus, (err, results) => {
            if (err)
                console.log(err);
            else {
                res.render("admindashboard", {
                    total: results[0][0].tot_customers,
                    pending: results[1][0].pending,
                    stock: results[2][0].stock,
                    out_for_delivery: results[3][0].out_for_delivery,
                    delivered: results[4][0].delivered
                });

            }
        });
    } else {
        res.redirect("/adminlogin");
    }
});


app.get("/consumerdashboard:cusid", (req, res) => {
    const cus_id = req.params.cusid;
    const cus_query = "SELECT cid, fname, lname, addr, phone,email FROM customers WHERE cid = " + cus_id + "";

    if (req.session.loggedin && req.session.cid === cus_id) {

        con.query(cus_query, (err, results) => {
            if (err)
                console.log(err);
            else {
                results.forEach((result) => {
                    res.render("dash", {
                        cus_id: result.cid,
                        name: result.fname + " " + result.lname,
                        addr: result.addr,
                        mobile: result.phone,
                        email: result.email
                    });
                });
            }

        });
    } else {
        res.redirect("/userlogin");
    }

});

app.get("/bookorder:cid", (req, res) => {
    const cus_id = req.params.cid;
    const cus_query = "SELECT fname,lname FROM customers WHERE cid = " + cus_id + "";

    if (req.session.loggedin && req.session.cid === cus_id) {

        con.query(cus_query, (err, results) => {
            if (err)
                console.log(err);
            else {
                results.forEach((result) => {
                    res.render("book_ord", {
                        cid: cus_id,
                        name: result.fname + " " + result.lname,
                        message: ""
                    });
                });
            }
        });
    } else {
        res.redirect("/userlogin");
    }

});

app.post("/bookorder:cid", (req, res) => {
    const cus_id = req.params.cid;
    const date_obj = new Date();
    const cur_date = date_obj.getFullYear() + "-" + (date_obj.getMonth() + 1) + "-" + date_obj.getDate();
    const cur_time = date_obj.getHours() + ":" + date_obj.getMinutes() + ":" + date_obj.getSeconds();
    const get_price = "SELECT price FROM details;"
    const diff_query = "SELECT DATEDIFF('" + cur_date + "',lob) as diff FROM customers WHERE cid = " + cus_id + "";
    const upd_cus = "UPDATE customers SET lob = '" + cur_date + "' WHERE cid = " + cus_id + "";
    const last = "SELECT fname,lname,lob,email FROM customers WHERE cid = " + cus_id + "";

    con.query(get_price, (err, prices) => {
        if (err)
            console.log(err);
        else
            bookorder(prices);
    });

    function bookorder(prices) {
        const order_query = "INSERT INTO orders (cid,date,time,amount,status) VALUES(" + cus_id + ",'" + cur_date + "','" + cur_time + "'," + prices[0].price + ",'Pending')";

        con.query(last, (err, results) => {

            let mailOptions = {
                from: process.env.EMAIL,
                to: results[0].email,
                subject: "Your Booking is Confirmed",
                html: "<div><h1>GAS BOOKING PORTAL</h1><div><p>Your Gas has been Successfully Booked<br>Price:" + prices[0].price + "<br>Date:" + cur_date + "<br>Time:" + cur_time + "<br><h3>Thank You</h3></p></div></div>"
            };

            var temp = results[0].lob;
            if (err)
                console.log(err);
            else if (temp == "0000-00-00") {
                console.log("Sucess");
                con.query(upd_cus, (err) => {
                    if (err)
                        console.log(err);
                    else
                        console.log("Successfully Updated Customers");
                });
                con.query(order_query, (err) => {
                    if (err)
                        console.log(err);
                    else {
                        sendMail(mailOptions);
                        res.render("book_ord", {
                            cid: cus_id,
                            name: results[0].fname + " " + results[0].lname,
                            message: "success"
                        });
                    }
                });

            } else {
                console.log("Fail");
                con.query(diff_query, (err, difference) => {
                    if (err)
                        console.log(err);
                    else if ((difference[0].diff) >= 30) {
                        con.query(upd_cus, (err) => {
                            if (err)
                                console.log(err);
                            else
                                console.log("Successfully Updated Customers");
                        });

                        con.query(order_query, (err) => {
                            if (err)
                                console.log(err);
                            else {
                                sendMail(mailOptions);
                                res.render("book_ord", {
                                    cid: cus_id,
                                    name: results[0].fname + " " + results[0].lname,
                                    message: "success"
                                });
                            }
                        });
                    } else {
                        res.render("book_ord", {
                            cid: cus_id,
                            name: results[0].fname + " " + results[0].lname,
                            message: "fail"
                        });
                    }
                });
            }
        });
    }
});

app.get("/profileupdate:cid", (req, res) => {
    const cus_id = req.params.cid;

    const cus_query = "SELECT * FROM customers WHERE cid = " + cus_id + "";
    if (req.session.loggedin && req.session.cid === cus_id) {

        con.query(cus_query, (err, results) => {
            if (err)
                console.log(err);
            else {
                results.forEach((result) => {
                    res.render("profileupdate", {
                        cid: result.cid,
                        name: result.fname + " " + result.lname,
                        address: result.addr,
                        pincode: result.pin,
                        phone: result.phone,
                        email: result.email,
                        pass: result.pass,
                        reg_date: result.reg,
                        message: ""

                    })
                });
            }
        });
    } else {
        res.redirect("/userlogin");
    }
});

app.post("/profileupdate:cid", (req, res) => {
    const cus_id = req.params.cid;
    const phone = req.body.mobile;
    const email = req.body.email;
    const pass = req.body.password;

    const update_query = "UPDATE customers SET phone = " + phone + ",email = '" + email + "',pass = '" + pass + "' WHERE cid = " + cus_id + "";
    const cus_query = "SELECT * FROM customers WHERE cid = " + cus_id + "";
    con.query(update_query, (err) => {
        if (err) {
            console.log(err);
            con.query(cus_query, (err, results) => {
                if (err)
                    console.log(err);
                else {
                    results.forEach((result) => {
                        res.render("profileupdate", {
                            cid: result.cid,
                            name: result.fname + " " + result.lname,
                            address: result.addr,
                            pincode: result.pin,
                            phone: result.phone,
                            email: result.email,
                            pass: result.pass,
                            reg_date: result.reg,
                            message: "fail"

                        })
                    });
                }
            });
        } else {
            console.log("Profile Updated Successfully");
            con.query(cus_query, (err, results) => {
                if (err)
                    console.log(err);
                else {
                    results.forEach((result) => {
                        res.render("profileupdate", {
                            cid: result.cid,
                            name: result.fname + " " + result.lname,
                            address: result.addr,
                            pincode: result.pin,
                            phone: result.phone,
                            email: result.email,
                            pass: result.pass,
                            reg_date: result.reg,
                            message: "success"

                        })
                    });
                }
            });
        }
    });

});
app.get("/trackrefill:cusid", (req, res) => {
    const cid = req.params.cusid;

    const track_query = "SELECT oid,date,time,amount,status FROM orders WHERE cid = " + cid + " AND (status = 'Pending' OR status = 'Out for Delivery')";
    const name_query = "SELECT fname, lname FROM customers WHERE cid = " + cid + "";
    var name;

    if (req.session.loggedin && req.session.cid === cid) {
        con.query(name_query, (err, results) => {
            if (err)
                console.log(err);
            else {
                results.forEach((result) => {
                    global.name = result.fname + " " + result.lname;
                });
            }
        });
        con.query(track_query, (err, results) => {
            if (err) {
                console.log(err);
            } else if (results.length == 0) {
                res.render("track_refill", {
                    oid: "",
                    cus_id: cid,
                    name: global.name,
                    date: "",
                    time: "",
                    amount: "",
                    status: ""
                });
            } else {
                console.log(results);
                res.render("track_refill", {
                    oid: results[0].oid,
                    cus_id: cid,
                    name: global.name,
                    date: results[0].date,
                    time: results[0].time,
                    amount: results[0].amount,
                    status: results[0].status
                });
            }
        });
    } else {
        res.redirect("/userlogin");
    }

});

app.get("/orderhistory:cid", (req, res) => {
    const cus_id = req.params.cid;
    const order_query = "SELECT oid,date,time,amount,status FROM orders WHERE cid = " + cus_id + " AND status LIKE 'Delivered'";
    const name_query = "SELECT fname, lname FROM customers WHERE cid = " + cus_id + "";
    var name;

    if (req.session.loggedin && req.session.cid === cus_id) {
        con.query(name_query, (err, results) => {
            if (err)
                console.log(err);
            else {
                results.forEach((result) => {
                    global.name = result.fname + " " + result.lname;
                });
            }
        });
        con.query(order_query, (err, results) => {
            if (err)
                console.log(err);
            else {
                res.render("ord_history", {
                    cid: cus_id,
                    name: global.name,
                    results: results
                });
            }
        });
    } else {
        res.redirect("/userlogin");
    }
});

app.get("/managecustomers", (req, res) => {

    const cus_query = "SELECT cid, fname,lname,addr,phone,email,reg FROM customers";
    if (req.session.loggedin && req.session.aid) {
        con.query(cus_query, (err, results) => {
            if (err)
                console.log(err);
            else {
                res.render("man_con", {
                    results: results
                });
            }
        });
    } else {
        res.redirect("/adminlogin");
    }
});

app.post("/managecustomer:cid", (req, res) => {

    const del_query = "DELETE FROM orders WHERE cid = " + req.params.cid + ";DELETE FROM customers WHERE cid = " + req.params.cid + ";";

    con.query(del_query, (err) => {
        if (err) {
            res.send("Fail");
            console.log(err);
        } else
            res.send("Success");
    });
});

app.get("/manageorders", (req, res) => {

    const cus_ord = "SELECT oid,o.cid,fname,lname,date,time,amount,status FROM customers c INNER JOIN orders o ON c.cid = o.cid WHERE status != 'Delivered' ORDER BY date,time";

    const ord = "SELECT oid,o.cid,fname,lname,date,time,amount,status FROM customers c INNER JOIN orders o  ON c.cid = o.cid WHERE status = 'Delivered' ORDER BY date,time";

    if (req.session.loggedin && req.session.aid) {
        con.query(cus_ord, (err, results) => {
            if (err)
                console.log(err);
            else {
                con.query(ord, (err, lists) => {
                    if (err)
                        console.log(err);
                    else {
                        res.render("chk_ord", {
                            results: results,
                            lists: lists
                        });
                    }
                });
            }
        });
    } else {
        res.redirect("/adminlogin");
    }
});

app.post("/manageorder:oid", (req, res) => {
    const oid = req.params.oid;
    const value = req.body.value;

    const update = "UPDATE orders SET status = '" + value + "' WHERE oid = " + oid + ";";
    const stck = "SELECT stock FROM details";
    const mail = "SELECT email FROM customers,orders WHERE customers.cid = orders.cid AND oid = " + oid + ";";
    const stc_dec = "UPDATE details SET stock = stock - 1";



    if (value == "Out for Delivery") {
        con.query(stck, (err, results) => {
            if (err)
                console.log(err);
            else {
                if (results[0].stock == 0) {
                    res.send("Empty");
                } else if (results[0].stock >= 1) {
                    con.query(stc_dec, (err) => {
                        if (err)
                            console.log(err);
                        else {
                            con.query(update, (err) => {
                                if (err) {
                                    res.send("Fail");
                                    console.log(err);
                                } else {

                                    con.query(mail, (err, mails) => {
                                        if (err)
                                            console.log(err);
                                        else {
                                            let mailOptions = {
                                                from: process.env.EMAIL,
                                                to: mails[0].email,
                                                subject: "Your Gas is Out for Delivery",
                                                html: "<div><h1>Gas Booking Portal</h1><div><p>Your Gas is Out for Delivery and will be Delivered by the end of the day.<br><h3>Thank You</h3></p></div></div>"
                                            };
                                            sendMail(mailOptions);
                                        }
                                    });
                                    res.send("Success");
                                }
                            });
                        }
                    });
                }
            }
        });
    } else if (value == "Delivered") {
        con.query(update, (err) => {
            if (err) {
                res.send("Fail");
                console.log(err);
            } else
                res.send("Success");
        });
    }
});

app.get("/update", (req, res) => {

    const query = "SELECT stock,price FROM details";

    if (req.session.loggedin && req.session.aid) {
        con.query(query, (err, results) => {
            if (err)
                console.log(err);
            else {
                res.render("update", {
                    stock: results[0].stock,
                    price: results[0].price
                });
            }
        });
    } else {
        res.redirect("/adminlogin");
    }
});

app.post("/update", (req, res) => {
    const name = req.body.name;
    const value = req.body.value;

    const price_query = "UPDATE details SET price = " + value + ";";

    const stock_query = "UPDATE details SET stock = stock + " + value + ";";

    if (name == "price") {
        con.query(price_query, (err) => {
            if (err)
                console.log(err);
            else
                res.redirect("/update");
        });
    }
    if (name == "stock") {
        con.query(stock_query, (err) => {
            if (err)
                console.log(err);
            else
                res.redirect("/update");
        });
    }
});

app.listen(8080, (req, res) => {
    console.log("Server Started at Port 8080");
});