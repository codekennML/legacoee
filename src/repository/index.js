

class DBLayer {


  constructor(model) {
    this.model = model;
  }

  async createDocs(data, session) {

    const createdDocs = await this.model.create(data, session);

    return createdDocs;
  }

  async findDocs(queryData) {
    const { query, select, populatedQuery, session, lean } = queryData;

    if (!populatedQuery && !lean) {
      const data = await this.model.find(query, select, { session });

      return data;
    }

    if (!populatedQuery && lean) {
      const data = await this.model.find(query, select, { session }).lean();
      return data;
    }

    if (populatedQuery && lean) {
      const data = await this.model
        .find(query, select, { session })
        .populate(populatedQuery)
        .lean();

      return data;
    }

    return [];
  }

  async findOneDoc(queryData) {
    const { query, select, populatedQuery, session, lean } = queryData;

    if (!populatedQuery && !lean) {
      const data = await this.model.findOne(query, select, { session });

      return data;
    }

    if (!populatedQuery && lean) {
      const data = await this.model.findOne(query, select, { session }).lean();

      return data;
    }

    if (populatedQuery && lean) {
      const data = await this.model
        .findOne(query, select, { session })
        .populate(populatedQuery)
        .lean();

      return data;
    }

    return null;
  }

  async findDocById(queryData) {

    const { query, select, populatedQuery, session, lean } = queryData;

    console.log(query, "GHU")

    if (!populatedQuery && !lean) {
      console.log(queryData, "TYue")
      const data = await this.model.findById(query, select, { session });

      return data;
    }

    if (!populatedQuery && lean) {

      const data = await this.model.findById(query, select, { session }).lean();
      return data;
    }

    if (populatedQuery && lean) {

      const data = await this.model
        .findById(query, select, { session })
        .populate(populatedQuery)
        .lean();
      return data;
    }

    console.log("DFG")
    return null;
  }

  async aggregateData(request) {

    if (request?.session) {

      return this.model.aggregate(request.pipeline).session(request.session)
    }

    const data = await this.model.aggregate(

      request.pipeline
    )

    return data

  }

  async paginateData(
    request
  ) {



    const data = await this.model.aggregate([
      {
        $match: request.query,
      },

      {
        $facet: {
          count: [{ $count: "total" }],
          matchedDocuments: request.aggregatePipeline,
        },
      },
      {
        $unwind: "$count",
      },
      {
        $project: {
          _id: 0,
          count: "$count.total",
          data: "$matchedDocuments",
        },
      },
    ]);


    if (!data || data.length === 0) {
      return {
        data: [],
        meta: {},
      };
    }

    const results = data[0]?.data;
    const mainData = results.length > request.pagination.pageSize ? results.slice(0, results.length - 1) : results

    const paginatedResult = {
      data: mainData,
      meta: {
        count: data[0]?.count || 0,
        //if the query has up to 101 results, it means there is a new page since we are querying for 100 per batch
        cursor: results.length === 101 && mainData[mainData.length - 1]?._id,
        pages: Math.ceil(data[0].count / request.pagination.pageSize),
      },
    };

    return paginatedResult;
  }

  async updateDoc(request) {
    const update = request.updateData;
    const options = request.options;
    const filter = request.docToUpdate;

    console.log(this.model, "model")
    const data = await this.model.findOneAndUpdate(filter, update, options);

    return data;
  }

  async bulkWriteDocs(request) {
    const { operations, options } = request;

    const result = await this.model.bulkWrite(operations, options);

    return result;
  }

  async updateManyDocs(request) {
    const updateManyQuery = this.model.updateMany(
      request.filter,
      request.updateData,
      request.options
    );

    const data = await updateManyQuery.lean().exec();

    return data;
  }

  //Use this when you want to perform an aggregation that is not linked to pagination of data
  async aggregateDocs(request, session) {
    const result = await this.model.aggregate(request, { session });
    return result;
  }

  async deleteDocs(request) {

    if (Array.isArray(request)) {
      const data = { _id: { $in: request } };

      const result = await this.model.deleteMany(data);

      return result;
    }

    const result = await this.model.deleteMany(request);

    return result;
  }
}

module.exports = DBLayer;
