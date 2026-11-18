import { Request, Response } from 'express';
import { DataService } from './data.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class DataController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.tenantModels || !req.user) {
      return sendError(res, 'Tenant context missing', [], 400);
    }

    const { title, description } = req.body;
    const item = await DataService.createData(req.tenantModels, req.user, { title, description });
    return sendSuccess(res, 'Tenant data record created successfully', item, 201);
  });

  static list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.tenantModels || !req.user) {
      return sendError(res, 'Tenant context missing', [], 400);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string;

    const result = await DataService.listData(req.tenantModels, req.user, page, limit, search);
    return sendSuccess(res, 'Tenant data records retrieved successfully', result, 200);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.tenantModels || !req.user) {
      return sendError(res, 'Tenant context missing', [], 400);
    }

    const item = await DataService.getDataById(req.tenantModels, req.user, req.params.id);
    if (!item) {
      return sendError(res, 'Record not found or outside permitted scope', [], 404);
    }

    return sendSuccess(res, 'Tenant data record retrieved successfully', item, 200);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.tenantModels || !req.user) {
      return sendError(res, 'Tenant context missing', [], 400);
    }

    const item = await DataService.updateData(
      req.tenantModels,
      req.user,
      req.params.id,
      req.body
    );

    if (!item) {
      return sendError(res, 'Record not found or outside permitted scope', [], 404);
    }

    return sendSuccess(res, 'Tenant data record updated successfully', item, 200);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.tenantModels || !req.user) {
      return sendError(res, 'Tenant context missing', [], 400);
    }

    const item = await DataService.deleteData(req.tenantModels, req.user, req.params.id);
    if (!item) {
      return sendError(res, 'Record not found or outside permitted scope', [], 404);
    }

    return sendSuccess(res, 'Tenant data record deleted successfully', item, 200);
  });
}
