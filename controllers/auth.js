const crypto = require("crypto");
//for password
const bcrypt = require("bcryptjs");
//validation

const { check, validationResult } = require("express-validator");

//mail
const { sendResetEmail, sendActivationEmail } = require("../models/sendMail");

const User = require("../models/user");
const user = require("../models/user");
const { ValidationError } = require("sequelize");

exports.getLogin = (req, res, next) => {
  const errorMessage = req.flash("error")[0] || null;
  const successMessage = req.flash("success")[0] || null;

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: errorMessage,
    successMessage: successMessage,
    oldInput: { email: "" },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  const errorMessage = req.flash("errorSign")[0] || null;
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Sign Up",
    errorMessage: errorMessage,
    oldInput: { email: "", password: "", confirmPassword: "" },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  // Log inputs
  console.log("Login attempt:", { email, password });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        console.log("User not found");
        req.flash("error", "Email not Found");
        return res.redirect("/login");
      }

      console.log("User found:", user);

      if (user.status === "pending") {
        req.flash("error", "Your account is Pending. Please contact support.");
        return res.redirect("/login");
      }

      return bcrypt.compare(password, user.password).then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save((err) => {
            if (err) {
              console.log("Session save error:", err);
              return next(err); // Pass error to error handler
            }
            res.redirect("/");
          });
        } else {
          console.log("Password mismatch");
          
          req.flash("error", "Invalid email or password.");
          return res.redirect("/login");
        }
      });
    })
    .catch((err) => {
      console.log("Error:", err);
      return next(err); // Pass error to error handler
    });
};



exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Sign Up",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashPassword) => {
      const activationToken = crypto.randomBytes(32).toString("hex");
      const user = new User({
        email: email,
        password: hashPassword,
        cart: { items: [] },
        activationToken: activationToken,
        activationTokenExpiration: Date.now() + 3600000, // Token valid for 1 hour
      });
      return user.save().then(() => {
        //const activationLink = `http://localhost:3000/activate/${activationToken}`;
        return sendActivationEmail(email, activationToken);
      });
    })
    .then(() => {
      req.flash(
        "success",
        "Account SignUp Successfully!!Please check your email to activate your account."
      );
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next();
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    console.log(err);
    res.redirect("/");
  });
};

//reset

exports.getReset = (req, res, next) => {
  const errorMessage = req.flash("errorReset")[0] || null;
  const successMessage = req.flash("successReset")[0] || null;
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: errorMessage,
    successMessage: successMessage,
  });
};

exports.postReset = (req, res, next) => {
  const { email } = req.body;

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.error("Error generating random bytes:", err);
      req.flash("errorReset", "Something went wrong, please try again.");
      return res.redirect("/reset");
    }

    const token = buffer.toString("hex");

    User.findOne({ email: email })
      .then((user) => {
        if (!user) {
          req.flash("errorReset", "No account with that email found.");
          return res.redirect("/reset");
        }

        // Update user document with reset token and expiration
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000; // 1 hour in milliseconds

        return user.save().then((result) => {
          // Send email with reset token
          const emailSent = sendResetEmail(email, token);

          if (emailSent) {
            req.flash("successReset", "Look in your email");
            return res.redirect("/reset");
          } else {
            req.flash("errorReset", "Email not sent.");
            return res.redirect("/reset");
          }
        });
      })
      .catch((err) => {
        console.error("Error in password reset:", err);
        req.flash("errorReset", "Something went wrong, please try again.");
        res.redirect("/reset");
      });
  });
};

//get Activate
exports.getActivate = (req, res, next) => {
  const token = req.params.token;

  User.findOne({
    activationToken: token,
    activationTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "Activation link is invalid or has expired.");
        return res.redirect("/login");
      }

      user.activationToken = undefined;
      user.activationTokenExpiration = undefined;
      user.status = "active"; // Activate the user account
      return user.save();
    })
    .then(() => {
      res.render("auth/accountActivate", {
        path: "/activate",
        pageTitle: "Account Activated",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next();
    });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      if (!user) {
        req.flash(
          "errorReset",
          "Password reset token is invalid or has expired."
        );
        return res.redirect("/reset");
      }

      const errorMessage = req.flash("errorNP")[0] || null;
      const successMessage = req.flash("successNP")[0] || null;

      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: errorMessage,
        successMessage: successMessage,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      console.error("Error fetching user with reset token:", err);
      req.flash("errorReset", "Something went wrong, please try again.");
      res.redirect("/reset");
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const newConfirmPassword = req.body.confirmPassword;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  if (newPassword !== newConfirmPassword) {
    console.log("password not match");
    req.flash("errorNP", "Passwords do not match.");
    return res.redirect(`/reset/${passwordToken}`);
  }

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      if (!user) {
        req.flash(
          "errorReset",
          "Password reset token is invalid or has expired."
        );
        return res.redirect("/reset");
      }
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashPassword) => {
      resetUser.password = hashPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(() => {
      req.flash("success", "Password changed successfully.");
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
      req.flash("errorNP", "Something went wrong, please try again.");
      res.redirect(`/reset/${passwordToken}`);
    });
};

//Account Setting
// exports.getAccount = (req, res, next) => {
//   const errorMessage = req.flash("errorSign")[0] || null;
//   res.render("auth/account", {
//     path: "/account",
//     pageTitle: "Account Setting",
//     errorMessage: errorMessage,
//     oldInput: { email: req.user.email },
//     validationErrors: [],
//   });
// };
// exports.postUpdateAccount = (req, res, next) => {
//   const email = req.body.email;
//   const password = req.body.password;
//   const confirmPassword = req.body.confirmPassword;
//   const errors = validationResult(req);

//   if (!errors.isEmpty()) {
//     return res.status(422).render("auth/account", {
//       path: "/account",
//       pageTitle: "Account Setting",
//       errorMessage: errors.array()[0].msg,
//       oldInput: {
//         email: email,
//         password: password,
//         confirmPassword: confirmPassword,
//       },
//       validationErrors: errors.array(),
//     });
//   }

//   // If there are no validation errors, proceed to update the user
//   User.findById(req.user._id)
//     .then(user => {
//       if (!user) {
//         return res.status(404).render("auth/account", {
//           path: "/account",
//           pageTitle: "Account Setting",
//           errorMessage: "User not found.",
//           oldInput: {
//             email: email,
//             password: password,
//             confirmPassword: confirmPassword,
//           },
//           validationErrors: [],
//         });
//       }

//       user.email = email;

//       if (password) {
//         return bcrypt
//           .hash(password, 12)
//           .then(hashedPassword => {
//             user.password = hashedPassword;
//             return user.save();
//           });
//       }

//       return user.save();
//     })
//     .then(result => {
//       req.flash("success", "Account updated successfully");
//       res.redirect("/account");
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

//another account setting
exports.getAccount = (req, res, next) => {
  const errorMessage = req.flash("errorSign")[0] || null;
  const successMessage = req.flash("success")[0] || null;
  res.render("auth/account", {
    path: "/account",
    pageTitle: "Account Setting",
    errorMessage: errorMessage,
    successMessage: successMessage,
    oldInput: { email: req.user.email },
    validationErrors: [],
  });
};

exports.postUpdateAccount = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/account", {
      path: "/account",
      pageTitle: "Account Setting",
      errorMessage: errors.array()[0].msg,
      successMessage: null,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  User.findById(req.user._id)
    .then((user) => {
      if (!user) {
        return res.status(404).render("auth/account", {
          path: "/account",
          pageTitle: "Account Setting",
          errorMessage: "User not found.",
          successMessage: null,
          oldInput: {
            email: email,
            password: password,
            confirmPassword: confirmPassword,
          },
          validationErrors: [],
        });
      }

      user.email = email;

      if (password) {
        return bcrypt.hash(password, 12).then((hashedPassword) => {
          user.password = hashedPassword;
          return user.save();
        });
      }

      return user.save();
    })
    .then((result) => {
      req.flash("success", "Account updated successfully");
      res.redirect("/account");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
