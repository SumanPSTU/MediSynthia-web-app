import yup from 'yup'
export const userSchema = yup.object({
    username: yup.string().trim().min(5, "username must be at least 5 characters!").required(),
    email: yup.string().email("The email is not valied!").required(),
    password: yup.string().min(6, "password must be at least 6 characters").required()

})

export const validateUser = (schema) => async (req, res, next) =>{
    try {
        await schema.validate(req.body)
        next()
    } catch (err) {
        return res.status(400).json({errors:err.errors})
    }
}