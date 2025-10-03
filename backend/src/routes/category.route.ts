import { Router } from 'express';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoriesHandler,
  getCategoryByIdHandler,
  setDefaultCategoriesHandler,
  updateCategoryHandler,
} from '../controllers/category.controller';

const categoryRoutes = Router();

categoryRoutes.post('/', createCategoryHandler);
categoryRoutes.get('/', getCategoriesHandler);
categoryRoutes.post('/defaults', setDefaultCategoriesHandler);
categoryRoutes.get('/:id', getCategoryByIdHandler);
categoryRoutes.patch('/:id', updateCategoryHandler);
categoryRoutes.delete('/:id', deleteCategoryHandler);

export default categoryRoutes;
