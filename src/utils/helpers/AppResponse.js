

const AppResponse = (
  status,
  data
) => {
 

  if (Array.isArray(data)) {


    let transformedData = []

    if (data[0] && data[0]["password"]) {

      transformedData = data.map(data => data.delete["password"])
    }

    const response = {
       status , 
       data : transformedData
  
    }; 

    return response

  
  }

  if (typeof data === "object" && "password" in data) {
    delete (data.password)
  }

  const response = {
    data,
    status
  };

 
  

};

module.exports =  AppResponse;
