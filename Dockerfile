
# Use an official Node.js runtime as a base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app


RUN npm install -g nodemon

# Copy package.json and package-lock.json to the working directory
COPY package.json ./

COPY package-lock.json ./

# Install app dependencies
RUN npm install

# Copy the application files
COPY . .

# Expose the port on which your app will run
EXPOSE 9001

# Define the command to run your app
CMD ["nodemon", "-L", "server.js"]