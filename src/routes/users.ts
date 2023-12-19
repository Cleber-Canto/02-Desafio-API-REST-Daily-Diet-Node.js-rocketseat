import { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'

export async function usersRoutes(app: FastifyInstance) {
  // Listagem de Usuários
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    try {
      const { sessionId } = request.cookies

      const users = await knex('users')
        .where('session_id', sessionId)
        .select('*')

      console.log('Lista de usuários:')
      users.forEach((user) => {
        console.log(user)
      })

      return { users }
    } catch (error) {
      console.error('Erro ao obter lista de usuários:', error)
      return response.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Listar um usuário específico pelo seu ID
  app.get(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      try {
        const { sessionId } = request.cookies
        const { id } = request.params

        const user = await knex('users')
          .where('session_id', sessionId)
          .where('id', id)
          .first()

        if (!user) {
          console.log(`Usuário com ID ${id} não encontrado`)
          return response
            .status(404)
            .send({ message: 'Usuário não encontrado' })
        }

        console.log(`Usuário com ID ${id} encontrado com sucesso`)
        return { user }
      } catch (error) {
        console.error('Erro ao buscar usuário por ID:', error)
        return response.status(500).send({ error: 'Erro interno do servidor' })
      }
    },
  )

  // Métricas
  app.get(
    '/metrics',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      const { sessionId } = request.cookies

      const meals = await knex('meals')
        .select(
          'meals.id',
          'meals.user_id',
          'meals.name',
          'meals.description',
          'meals.dateAndHour',
          'meals.inDiet',
        )
        .innerJoin('users', 'users.id', 'meals.user_id')
        .where('session_id', sessionId)

      if (meals.length === 0) {
        return response.status(404).send({
          message:
            'Você não tem nenhuma refeição cadastrada para obter métricas.',
        })
      }

      const totalNumberOfMeals = meals.length
      const totalNumberOfMealsInTheDiet = meals.filter(
        (item) => item.inDiet === 1,
      ).length
      const totalNumberOfMealsOffTheDiet = meals.filter(
        (item) => item.inDiet === 0,
      ).length

      let currentStreak = 0
      let maxStreak = 0

      for (const meal of meals) {
        if (meal.inDiet === 1) {
          currentStreak++
        } else {
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak
          }
          currentStreak = 0
        }
      }

      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
      }

      const metricsResponse = {
        totalNumberOfMeals,
        totalNumberOfMealsInTheDiet,
        totalNumberOfMealsOffTheDiet,
        bestSequenceOfMealsWithinTheDiet: maxStreak,
      }

      return metricsResponse
    },
  )
  // Criação de Usuário
  app.post('/', async (request, response) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string().email(),
      address: z.string(),
      weight: z.number(),
      height: z.number(),
    })

    try {
      const { name, email, address, weight, height } =
        createUserBodySchema.parse(request.body)

      const checkUserExist = await knex
        .select('*')
        .from('users')
        .where('email', email)
        .first()

      if (checkUserExist) {
        console.log(`Email ${email} já está vinculado a um usuário`)
        return response.status(400).send({
          error: 'Este email já está vinculado à um usuário',
        })
      }

      let sessionId = request.cookies.sessionId

      if (!sessionId) {
        sessionId = randomUUID()

        response.cookie('sessionId', sessionId, {
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
        })
      }

      await knex('users').insert({
        id: randomUUID(),
        name,
        email,
        address,
        weight,
        height,
        session_id: sessionId,
      })

      console.log(`Usuário ${name} cadastrado com sucesso`)
      return response
        .status(201)
        .send({ message: 'Usuário cadastrado com sucesso' })
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error)
      return response.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
  // Atualização de Usuário (PUT)
  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      try {
        const { sessionId } = request.cookies
        const { id } = request.params
        const updateUserBodySchema = z.object({
          name: z.string(),
          email: z.string().email(),
          address: z.string(),
          weight: z.number(),
          height: z.number(),
        })

        const { name, email, address, weight, height } =
          updateUserBodySchema.parse(request.body)

        const updatedUser = await knex('users')
          .where('session_id', sessionId)
          .where('id', id)
          .update({
            name,
            email,
            address,
            weight,
            height,
          })

        if (!updatedUser) {
          console.log(`Usuário com ID ${id} não encontrado`)
          return response
            .status(404)
            .send({ message: 'Usuário não encontrado' })
        }

        console.log(`Usuário com ID ${id} atualizado com sucesso`)
        return response
          .status(200)
          .send({ message: 'Usuário atualizado com sucesso' })
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error)
        return response.status(500).send({ error: 'Erro interno do servidor' })
      }
    },
  )

  // Exclusão de Usuário (DELETE)
  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      try {
        const { sessionId } = request.cookies
        const { id } = request.params

        const deletedUser = await knex('users')
          .where('session_id', sessionId)
          .where('id', id)
          .del()

        if (!deletedUser) {
          console.log(`Usuário com ID ${id} não encontrado`)
          return response
            .status(404)
            .send({ message: 'Usuário não encontrado' })
        }

        console.log(`Usuário com ID ${id} excluído com sucesso`)
        return response
          .status(200)
          .send({ message: 'Usuário excluído com sucesso' })
      } catch (error) {
        console.error('Erro ao excluir usuário:', error)
        return response.status(500).send({ error: 'Erro interno do servidor' })
      }
    },
  )
  // Resumo dos usuários
  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      try {
        const { sessionId } = request.cookies

        // Verifica se o usuário está autenticado
        const [user] = await knex('users')
          .where('session_id', sessionId)
          .select('id')

        if (!user) {
          console.error('Usuário não encontrado')
          return response.status(404).send({ error: 'Usuário não encontrado' })
        }

        // Obtém o total de usuários cadastrados
        const [totalUsers] = await knex('users').count(
          'id as Total de usuários',
        )

        const summary = {
          'Total de usuários cadastrados': parseInt(
            totalUsers['Total de usuários'],
          ),
        }

        console.log('Resumo dos usuários:', summary) // Adicionando o console.log

        return { summary }
      } catch (error) {
        console.error('Erro ao obter resumo dos usuários:', error)
        return response.status(500).send({ error: 'Erro interno do servidor' })
      }
    },
  )
}
