const dataWithPaginatedResults = (aggregateData) => {
  return [
    {
      $facet: {
        count: [{ $count: "total" }],
        matchedDocuments: aggregateData,
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
  ];
};

module.exports = dataWithPaginatedResults;
