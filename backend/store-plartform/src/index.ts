import { app } from "./server";

const PORT = 3000;

app.listen(PORT, () => {
  // console.log(`Platform API running on port ${PORT}`);
  console.log(`server is running at http://localhost:${PORT}`);
});
