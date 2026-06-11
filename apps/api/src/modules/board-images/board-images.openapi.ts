export const boardImagesOpenApiSchemas = {
  BoardImageUrlResponse: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri' },
      fen: { type: 'string' },
      normalizedFen: { type: 'string' },
      pov: { type: 'string', enum: ['white', 'black'] },
      turn: { type: 'string', enum: ['none', 'white', 'black'] },
    },
    required: ['url', 'fen', 'normalizedFen', 'pov', 'turn'],
  },
};

const boardImageParameters = [
  { name: 'fen', in: 'query', required: true, schema: { type: 'string' } },
  { name: 'pov', in: 'query', schema: { type: 'string', enum: ['white', 'black'], default: 'white' } },
  { name: 'turn', in: 'query', schema: { type: 'string', enum: ['none', 'auto', 'white', 'black'], default: 'none' } },
];

export const getBoardImageUrlOpenApiOperation = {
  tags: ['Board images'],
  summary: 'Build a Chessvision board image URL',
  description: 'Validates and normalizes a FEN, then returns a provider URL without fetching the image.',
  parameters: boardImageParameters,
  responses: {
    '200': {
      description: 'Board image URL details',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/BoardImageUrlResponse' } } },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const getBoardImageOpenApiOperation = {
  tags: ['Board images'],
  summary: 'Redirect to a Chessvision board image',
  description: 'Validates and normalizes a FEN, then redirects to the provider. The API does not fetch or proxy image bytes.',
  parameters: boardImageParameters,
  responses: {
    '302': {
      description: 'Redirect to the board image provider',
      headers: {
        Location: { schema: { type: 'string', format: 'uri' } },
        'Cache-Control': { schema: { type: 'string' } },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};
