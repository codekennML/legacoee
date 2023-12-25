const AppError = require("../../middlewares/errors/BaseError");

class SharedRepository {
  async createDoc(request, model, session) {
    let createdDoc;

    if (session) createdDoc = await model.create([request], { session });
    else {
      createdDoc = await model.create(request);
    }

    return createdDoc;
  }

  async findDocs(request, model, session, populatedQuery) {
    let response;

    if (session) {
      response = await model
        .find(request.body, request.select, { session })
        .populate(populatedQuery)
        .lean();
    } else {
      response = await model
        .find(request.body)
        .select(request.select)
        .populate(populatedQuery)
        .lean();
    }

    if (!response || response?.length === 0)
      throw new AppError(
        `No results match this search.Try broadening your query`,
        `Attempt to retrieve data from model - ${model} -  No result found  - request  -  ${request} `,
        404
      );

    return response;
  }

  async findDocById(request, model, session, populatedQuery) {
    let response;

    // console.log(request, model, session, populatedQuery, "Mija")

    if (session) {
      response = await model
        .findById(request.id, request.select, { session })
        .populate(populatedQuery)
        .lean();
    } else {
      response = await model
        .findById(request.id)
        .select(request.select)
        .populate(populatedQuery)
        .lean();
    }
    if (!response)
      throw new AppError(
        `No results match this search.Try broadening your query`,
        `Attempt to retrieve - ${model}  data for request : ${request} `,
        404
      );
    return response;
  }

  async findOneDoc(request, model, session, populatedQuery) {
    let response;

    if (session) {
      response = await model
        .findOne(request.params, request.select, { session })
        .populate(populatedQuery)
        .lean();
    } else {
      response = await model
        .findOne(request.params)
        .select(request.select)
        .populate(populatedQuery)
        .lean();
    }

    return response;
  }

  async updateDoc(request, model) {
    const response = await model.findByIdAndUpdate(
      request.id,
      request.body,
      request.misc
    );

    // console.log("response", response)
    return response;
  }

  async bulkUpdateDocs(request, model, session) {
    let result;
    if (session) result = await model.bulkWrite(request, { session });
    else {
      result = await model.bulkWrite(request, { session });
    }
    return result;
  }

  async softDelete(request, model) {
    const { eventId } = request;

    const userDeletedEvent = await this.updateDoc(
      {
        id: eventId,
        body: {
          $set: {
            userDeleted: true,
          },
        },
        misc: { new: true, select: "_id" },
      },
      model
    );

    return userDeletedEvent;
  }

  async purgeDocs(request, model, session) {
    //This takes an array of values, usually an Id and deletes its all
    const { currentUser, dataArray } = request;

    let purgedDocs;

    const purgeData = dataArray.map((data) => mongoose.Types.ObjectId(data));

    if (session) purgedDocs = await model.deleteMany(purgeData, { session });
    else {
      purgedDocs = await model.deleteMany(purgeData);
    }
    return purgedDocs;

    //TODO : Log the userId of the admin that purged the docs
  }

  async returnPaginatedDocs(request, model) {
    let docs;
    const searchResults = await model.aggregate([
      {
        $match: request.query,
      },

      ...dataWithPaginatedResults(request.aggregateData),
    ]);

    if (!searchResults || searchResults.length === 0) {
      docs = [];
      return docs;
    }

    docs = {
      data: searchResults[0].data,
      meta: {
        count: searchResults[0]?.count,
        page: request.pagination.page,
        pages: Math.ceil(searchResults[0].count / request.pagination.pageSize),
      },
    };

    return docs;
  }
}

module.exports = new SharedRepository();
