import { BAD_REQUEST, CONFLICT, CREATED, NOT_FOUND, OK } from '../libs/http';
import {
  checkCategoryNameExisting,
  createCategory,
  deleteCategory,
  getCategoies,
  getCategoryById,
  setDefaultCategories,
  updateCategory,
} from '../services/category.service';
import appAssert from '../utils/appAssert';
import catchErrors from '../utils/catchErrors';
import {
  createCategorySchema,
  getCategoriesSchema,
  updateCategorySchema,
} from './z-schema/category.schema';

export const createCategoryHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const data = createCategorySchema.parse(req.body);

  const nameExists = await checkCategoryNameExisting(data.name, userId);
  appAssert(!nameExists, CONFLICT, 'Category name already exists');

  const category = await createCategory({ ...data, userId });

  return res.status(CREATED).json({ category });
});

export const getCategoriesHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const params = getCategoriesSchema.parse(req.query);
  const categories = await getCategoies(userId, params);

  return res.status(OK).json({ categories });
});

export const getCategoryByIdHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const category = await getCategoryById(id, userId);
  appAssert(category, NOT_FOUND, 'Category Not found');

  return res.status(OK).json({ category });
});

export const setDefaultCategoriesHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');
  const result = await setDefaultCategories(userId);
  return res.status(OK).json({
    message: `Successfully created ${result.count} default categories`,
    data: result.categories,
  });
});

export const updateCategoryHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const data = updateCategorySchema.parse(req.body);

  if (data.name) {
    const nameExists = await checkCategoryNameExisting(data.name, userId, id);
    appAssert(!nameExists, CONFLICT, 'Category name already exists');
  }

  const category = await updateCategory(id, userId, data);

  return res.status(OK).json({ category });
});

export const deleteCategoryHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  await deleteCategory(id, userId);

  return res.status(OK).json({ message: 'Category deleted successfully' });
});
