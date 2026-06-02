const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Monopoly Game API',
    version: '1.0.0',
    description: 'API documentation for room management of the online Monopoly game'
  },
  servers: [
    {
      url: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`,
      description: 'Local server'
    }
  ],
  components: {
    schemas: {
      Player: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          socketId: { type: 'string' },
          position: { type: 'integer', example: 0 },
          money: { type: 'integer', example: 1500 }
        },
        required: ['name']
      },
      Room: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          host: { type: 'string' },
          players: { type: 'array', items: { $ref: '#/components/schemas/Player' } },
          maxPlayers: { type: 'integer', example: 4 },
          status: { type: 'string', example: 'waiting' },
          boardState: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/api/rooms': {
      get: {
        summary: 'List rooms',
        responses: {
          '200': {
            description: 'Array of rooms',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Room' } } } }
          }
        }
      },
      post: {
        summary: 'Create a room',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' }, host: { type: 'string' }, maxPlayers: { type: 'integer' } }, required: ['name','host'] }
            }
          }
        },
        responses: { '201': { description: 'Room created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } } }
      }
    },
    '/api/rooms/{id}': {
      get: {
        summary: 'Get room by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Room', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } }, '404': { description: 'Not found' } }
      },
      put: {
        summary: 'Update room',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } },
        responses: { '200': { description: 'Updated room' }, '404': { description: 'Not found' } }
      },
      delete: {
        summary: 'Delete room',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } }
      }
    },
    '/api/rooms/{id}/join': {
      post: {
        summary: 'Join a room',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Player' } } } },
        responses: { '200': { description: 'Joined room', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } }, '400': { description: 'Bad request' } }
      }
    },
    '/api/rooms/{id}/spectators': {
      post: {
        summary: 'Join room as spectator',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } },
        responses: { '200': { description: 'Spectator joined', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } }, '400': { description: 'Bad request' } }
      }
    },
    '/api/rooms/{id}/spectate': {
      post: {
        summary: 'Join room as spectator (alternative)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } },
        responses: { '200': { description: 'Spectator joined', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } }, '400': { description: 'Bad request' } }
      }
    },
    '/api/rooms/{id}/spectators/leave': {
      post: {
        summary: 'Leave room as spectator',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } },
        responses: { '200': { description: 'Spectator left', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } }, '400': { description: 'Bad request' } }
      }
    },
    '/api/rooms/{id}/start': {
      post: {
        summary: 'Start a room',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Room started', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } },
          '400': { description: 'Invalid room state or not enough players' },
          '404': { description: 'Room not found' }
        }
      }
    },
    '/api/rooms/{id}/end': {
      post: {
        summary: 'End a room',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Room ended', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } },
          '400': { description: 'Invalid room state' },
          '404': { description: 'Room not found' }
        }
      }
    }
  }
};

module.exports = swaggerDocument;
