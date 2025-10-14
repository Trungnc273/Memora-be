import UserModel from "../../core/models/user.model.js";

export async function detail(request, response) {
  const userId = request.params.userId;
  const user = await UserModel.findById(userId, { _id: 0, password: 0 });
  response.status(200).json({
    status: "OK",
    data: user,
  });
}

export async function update(request, response) {
  // TODO: implement update logic
}
