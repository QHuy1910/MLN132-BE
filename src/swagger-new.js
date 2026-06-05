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
        tags: ['Rooms'],
        summary: 'Liệt kê tất cả phòng',
        description: 'Lấy danh sách tất cả phòng chơi hiện tại',
        responses: {
          '200': {
            description: 'Danh sách phòng',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Room' } },
                examples: {
                  rooms: {
                    value: [
                      {
                        _id: '507f1f77bcf86cd799439011',
                        name: 'Phòng 1',
                        host: 'Huy',
                        maxPlayers: 4,
                        status: 'waiting',
                        players: [],
                        boardState: {},
                        createdAt: '2024-05-25T10:00:00Z'
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Rooms'],
        summary: 'Tạo phòng mới',
        description: 'Tạo phòng chơi mới với tên và chủ phòng',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  host: { type: 'string' },
                  maxPlayers: { type: 'integer', default: 5 }
                },
                required: ['name', 'host']
              },
              examples: {
                createRoom: { value: { name: 'Phòng cuối tuần', host: 'Huy', maxPlayers: 4 } }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Phòng được tạo thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Room' },
                examples: {
                  created: {
                    value: {
                      _id: '507f1f77bcf86cd799439011',
                      name: 'Phòng cuối tuần',
                      host: 'Huy',
                      maxPlayers: 4,
                      status: 'waiting',
                      players: [],
                      boardState: {},
                      createdAt: '2024-05-25T10:00:00Z'
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Dữ liệu request không hợp lệ' }
        }
      }
    },
    '/api/rooms/{id}': {
      get: {
        tags: ['Rooms'],
        summary: 'Lấy chi tiết phòng',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '507f1f77bcf86cd799439011' }
        ],
        responses: {
          '200': {
            description: 'Chi tiết phòng',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Room' },
                examples: {
                  room: {
                    value: {
                      _id: '507f1f77bcf86cd799439011',
                      name: 'Phòng 1',
                      host: 'Huy',
                      maxPlayers: 4,
                      status: 'waiting',
                      players: [{ name: 'Huy', socketId: 'socket123', position: 0, money: 1500 }],
                      boardState: {},
                      createdAt: '2024-05-25T10:00:00Z'
                    }
                  }
                }
              }
            }
          },
          '404': { description: 'Không tìm thấy phòng' }
        }
      },
      put: {
        tags: ['Rooms'],
        summary: 'Cập nhật phòng',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '507f1f77bcf86cd799439011' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: { type: 'string', enum: ['waiting', 'playing', 'finished'] },
                  maxPlayers: { type: 'integer' }
                }
              },
              examples: {
                updateStatus: { value: { status: 'playing' } }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Phòng được cập nhật thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } }
          },
          '404': { description: 'Không tìm thấy phòng' }
        }
      },
      delete: {
        tags: ['Rooms'],
        summary: 'Xóa phòng',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '507f1f77bcf86cd799439011' }
        ],
        responses: {
          '200': {
            description: 'Phòng được xóa thành công',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
                examples: { success: { value: { message: 'Room deleted' } } }
              }
            }
          },
          '404': { description: 'Không tìm thấy phòng' }
        }
      }
    },
    '/api/rooms/{id}/join': {
      post: {
        tags: ['Rooms'],
        summary: 'Vào phòng',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '507f1f77bcf86cd799439011' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  socketId: { type: 'string' }
                },
                required: ['name']
              },
              examples: {
                join: { value: { name: 'Linh', socketId: 'socket456' } }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Người chơi vào phòng thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Room' },
                examples: {
                  joined: {
                    value: {
                      _id: '507f1f77bcf86cd799439011',
                      name: 'Phòng 1',
                      host: 'Huy',
                      maxPlayers: 4,
                      status: 'waiting',
                      players: [
                        { name: 'Huy', socketId: 'socket123', position: 0, money: 1500 },
                        { name: 'Linh', socketId: 'socket456', position: 0, money: 1500 }
                      ],
                      boardState: {},
                      createdAt: '2024-05-25T10:00:00Z'
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Phòng đầy hoặc request không hợp lệ' }
        }
      }
    },
    '/api/rooms/{id}/spectators': {
      post: {
        tags: ['Rooms'],
        summary: 'Vào phòng với tư cách người xem',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '507f1f77bcf86cd799439011' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  socketId: { type: 'string' }
                },
                required: ['name']
              },
              examples: {
                spectate: { value: { name: 'Linh', socketId: 'socket456' } }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Người xem vào phòng thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } }
          },
          '400': { description: 'Yêu cầu không hợp lệ' }
        }
      }
    },
    '/api/rooms/{id}/spectate': {
      post: {
        tags: ['Rooms'],
        summary: 'Vào phòng với tư cách người xem (API thay thế)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '507f1f77bcf86cd799439011' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  socketId: { type: 'string' }
                },
                required: ['name']
              },
              examples: {
                spectate: { value: { name: 'Linh', socketId: 'socket456' } }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Người xem vào phòng thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } }
          },
          '400': { description: 'Yêu cầu không hợp lệ' }
        }
      }
    },
    '/api/rooms/{id}/spectators/leave': {
      post: {
        tags: ['Rooms'],
        summary: 'Rời phòng với tư cách người xem',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '507f1f77bcf86cd799439011' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' }
                },
                required: ['name']
              },
              examples: {
                leave: { value: { name: 'Linh' } }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Người xem rời phòng thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } }
          },
          '400': { description: 'Yêu cầu không hợp lệ' }
        }
      }
    }
  }
};

module.exports = swaggerDocument;
