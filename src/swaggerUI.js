import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';

const router = express.Router();

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
