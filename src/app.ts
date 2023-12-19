/* eslint-disable @typescript-eslint/no-unused-vars */
import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import { usersRoutes } from './routes/users'
import { mealsRoutes } from './routes/meals'

export const app = fastify()

// Cadastrando os cookies
app.register(fastifyCookie)

// Registrando plugins - rotas
// O segundo parâmetro é o prefix -> que é o prefixo da url para ativar
app.register(usersRoutes, { prefix: 'users' })
app.register(mealsRoutes, { prefix: 'meals' })
