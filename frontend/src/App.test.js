import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders free-to-use badge", () => {
  render(<App />);
  const badge = screen.getByText(/free to use/i);
  expect(badge).toBeInTheDocument();
});
