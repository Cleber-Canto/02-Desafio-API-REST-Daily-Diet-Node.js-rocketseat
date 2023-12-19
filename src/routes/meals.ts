/* eslint-disable prettier/prettier */
import { FastifyInstance, FastifyReply } from 'fastify'
import { knex } from '../database'
import crypto from 'node:crypto'
import { z } from 'zod'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'
import { FastifyRequest } from 'fastify/types/request'

export async function mealsRoutes(app: FastifyInstance) {
  // Criação de uma nova refeição
  app.post(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request: FastifyRequest, response: FastifyReply) => {
      try {
        const { sessionId } = request.cookies
  
        const [user] = await knex('users')
          .where('session_id', sessionId)
          .select('id')
  
        if (!user) {
          console.error('Usuário não encontrado')
          return response.status(404).send({ error: 'Usuário não encontrado' })
        }
  
        const userId = user.id
  
        const createMealBodySchema = z.object({
          name: z.string(),
          description: z.string(),
          isOnTheDiet: z.boolean(),
        })
  
        const { name, description, isOnTheDiet } = createMealBodySchema.parse(
          request.body,
        )
  
        await knex('meals').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          name,
          description,
          isOnTheDiet,
        })
  
        console.log(`Refeição criada com sucesso para o usuário com ID: ${userId}`)
        
        return response.status(201).send('Refeição criada com sucesso')
      } catch (error) {
        console.error('Erro ao criar refeição:', error)
        return response.status(500).send({ error: 'Erro interno do servidor' })
      }
    },
  )
  
  // Listando todas refeições apenas do usuário
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    try {
      const { sessionId } = request.cookies
  
      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')
  
      if (!user) {
        console.error('Usuário não encontrado')
        return response.status(404).send({ error: 'Usuário não encontrado' })
      }
  
      const userId = user.id
  
      // .where('user_id', userId) -> Selecionar apenas onde a coluna user_id seja correspondende ao id do usuário que criou o prato
      const meals = await knex('meals').where('user_id', userId).select()
  
      console.log('Refeições do usuário:')
      meals.forEach(meal => {
        console.log(meal);
      });
  
      return {
        meals,
      }
    } catch (error) {
      console.error('Erro ao obter refeições do usuário:', error)
      return response.status(500).send({ error: 'Erro interno do servidor' })
    }
  })  

  // Listando uma refeição específica do usuário
  app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request, response) => {
    try {
      // Capturando os parâmetros nomeados (/:id)
      // Tipando
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })
  
      const params = getMealParamsSchema.parse(request.params)
      const { sessionId } = request.cookies
  
      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')
  
      if (!user) {
        console.error('Usuário não encontrado')
        return response.status(404).send({ error: 'Usuário não encontrado' })
      }
  
      const userId = user.id
  
      // Buscando a refeição do db
      // Buscando na tabela meals, na coluna ID, o params.id (que é o que vem da rota)
      // .first() é para não retornar como array e sim como (existindo ou undefined)
      const meal = await knex('meals')
        .where('id', params.id)
        .andWhere('user_id', userId)
        .first()
  
      if (!meal) {
        return response.status(404).send({
          error: 'Refeição não encontrada',
        })
      }
  
      console.log('Refeição específica:')
      console.log(meal);
  
      return { meal }
    } catch (error) {
      console.error('Erro ao obter refeição específica:', error)
      return response.status(500).send({ error: 'Erro interno do servidor' })
    }
  })  

  // Apagando uma refeição cadastrada
  app.delete('/:id', { preHandler: [checkSessionIdExists] }, async (request, response) => {
    try {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })
  
      const params = getMealParamsSchema.parse(request.params)
  
      // Buscando o usuário
      const { sessionId } = request.cookies
  
      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')
  
      if (!user) {
        console.error('Usuário não encontrado')
        return response.status(404).send({ error: 'Usuário não encontrado' })
      }
  
      const userId = user.id
  
      const meal = await knex('meals')
        .where('id', params.id)
        .andWhere('user_id', userId)
        .first()
        .delete()
  
      if (!meal) {
        return response.status(401).send({
          error: 'Unauthorized',
        })
      }
  
      console.log('Refeição deletada com sucesso');
  
      return response.status(202).send('Refeição deletada com sucesso')
    } catch (error) {
      console.error('Erro ao deletar refeição:', error)
      return response.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
  
  // Editando uma refeição cadastrada
  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      try {
        // Capturando o parâmetro id pelos params e tipando
        const getMealParamsSchema = z.object({
          id: z.string().uuid(),
        })
  
        const params = getMealParamsSchema.parse(request.params)
  
        // Buscando o usuário partir dos cookies
        const { sessionId } = request.cookies
  
        const [user] = await knex('users')
          .where('session_id', sessionId)
          .select('id')
  
        if (!user) {
          console.error('Usuário não encontrado')
          return response.status(404).send({ error: 'Usuário não encontrado' })
        }
  
        const userId = user.id
  
        // Validando e capturando o que o usuário está mandando pelo body
        const editMealBodySchema = z.object({
          name: z.string(),
          description: z.string(),
          isOnTheDiet: z.boolean(),
        })
  
        const { name, description, isOnTheDiet } = editMealBodySchema.parse(
          request.body,
        )
  
        // Buscando a refeição existente, passando o id que veio por params e o id do usuário capturado pelo session_id
        const meal = await knex('meals')
          .where('id', params.id)
          .andWhere('user_id', userId)
          .first()
          .update({
            name,
            description,
            isOnTheDiet,
          })
  
        // Caso não seja encontrada no db
        if (!meal) {
          return response.status(401).send({
            error: 'Refeição não encontrada',
          })
        }
  
        console.log(`Refeição editada com sucesso para o usuário com ID: ${userId}`)
  
        // Adicionando uma mensagem de sucesso à resposta
        return response.status(202).send({ message: 'Refeição editada com sucesso' });
      } catch (error) {
        console.error('Erro ao editar refeição:', error)
        return response.status(500).send({ error: 'Erro interno do servidor' })
      }
    },
  )  
  
  // Resumo das refeições
  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      try {
        // .sum('coluna') => Soma a quantidade de valores de uma coluna do db

        // Buscando o usuário
        const { sessionId } = request.cookies

        const [user] = await knex('users')
          .where('session_id', sessionId)
          .select('id')

        if (!user) {
          console.error('Usuário não encontrado')
          return response.status(404).send({ error: 'Usuário não encontrado' })
        }

        const userId = user.id

        const [count] = await knex('meals')
          .count('id', {
            as: 'Total de refeições registradas',
          })
          .where('user_id', userId)

        const refDieta = await knex('meals')
          .count('id', { as: 'Total de refeições dentro da dieta' })
          .where('isOnTheDiet', true)
          .andWhere('user_id', userId)

        const refForaDieta = await knex('meals')
          .count('id', { as: 'Total de refeições fora da dieta' })
          .where('isOnTheDiet', false)
          .andWhere('user_id', userId)

        const summary = {
          'Total de refeições registradas': parseInt(
            JSON.parse(JSON.stringify(count))['Total de refeições registradas'],
          ),

          'Total de refeições dentro da dieta': parseInt(
            JSON.parse(JSON.stringify(refDieta))[0][
              'Total de refeições dentro da dieta'
            ],
          ),

          'Total de refeições fora da dieta': parseInt(
            JSON.parse(JSON.stringify(refForaDieta))[0][
              'Total de refeições fora da dieta'
            ],
          ),
        }

        console.log('Resumo das refeições:', summary);

        return {
          summary,
        }
      } catch (error) {
        console.error('Erro ao obter resumo das refeições:', error)
        return response.status(500).send({ error: 'Erro interno do servidor' })
      }
    },
  )
}
