import UserModel from "../models/user-model.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';


class UserController {
    async registration(req, res) {
        try {
            const {email, userName, password} = req.body
            const candidate = await UserModel.findOne({userName, email})
            if (candidate) {
                return res.status(400).json({message: "Пользователь с таким именем или почтой уже существует"})
            }
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const doc = new UserModel({
                email: req.body.email,
                userName: req.body.userName,
                passwordHash: hash,
            })
            const user = await doc.save();

            const token = jwt.sign({
                _id: user._id,
            }, process.env.JWT_ACCESS_SECRET, {expiresIn: '30d'})

            const {passwordHash, ...userData} = user._doc
            res.json({...userData, token})
        } catch (e) {
            console.log(e);
            res.status(500).json({
                message: 'Не удалось зарегистрироваться',
            });
        }
    }

    async login(req, res) {
        try {
            const user = await UserModel.findOne({userName: req.body.userName})
            if (!user) {
                return res.status(404).json({
                    message: 'Пользователь не найден'
                })
            }

            const isValidPass = await bcrypt.compare(req.body.password, user._doc.passwordHash);
            if (!isValidPass) {
                return res.status(400).json({
                    message: 'Неверный логин или пароль',
                });
            }
            const token = jwt.sign(
                {_id: user._id,}, process.env.JWT_ACCESS_SECRET, {expiresIn: '30d',});
            const {passwordHash, ...userData} = user._doc
            res.json({...userData, token})

        } catch (e) {
            console.log(e);
            res.status(500).json({
                message: 'Не удалось авторизоваться',
            });
        }
    }

    async authMe(req, res) {
        try {
            const user = await UserModel.findById(req.userId);

            if (!user) {
                return res.status(404).json({
                    message: 'Пользователь не найден',
                });
            }

            const {passwordHash, ...userData} = user._doc;

            res.json(userData);

        } catch (e) {
            console.log(e);
            res.status(500).json({
                message: 'Нет доступа',
            });
        }
    }

    async getUsers(req, res) {
        try {
            const users = await UserModel.find()
            res.json(users)
        } catch (e) {
            console.log(e)
        }
    }

    async updateUser(req, res) {
        try {

            const userId = req.params.id;
            const user = req.body;
            const userName = user?.userName
            if (userName) {
                if (userName.length < 3 || userName.length > 16) {
                    return res.status(400).json({message: "Имя пользователя должно быть минимум 3 максимум 16 символа "})
                }
                const userNameCheck = await UserModel.findOne({userName})
                if (userNameCheck) {
                    return res.status(400).json({message: "Это имя пользователя уже занято"})
                }
            }

            await UserModel.findByIdAndUpdate({_id: userId}, {
                ...user
            })
            res.json({
                success: true
            })
        } catch (e) {
            console.log(e);
            res.status(500).json({
                message: 'Не удалось обновить данные пользователя',
            });
        }
    }
}

export default new UserController()