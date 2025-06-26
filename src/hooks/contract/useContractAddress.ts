export function useContractAddress() {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";
  switch (environment) {
    case "staging":
    case "local":
    case "test":
      return "0xa1a1Cd7aE065F6A0052F8dA439eC71d3dF627CE3";
    case "production":
    default:
      return "0xF8557708e908CBbBD3DB3581135844d49d61E2a8";
  }
}
