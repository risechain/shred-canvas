-include .env

# deps
update:; forge update
build  :; forge build
size  :; forge build --sizes

# storage inspection
inspect :; forge inspect ${contract} storage-layout --pretty

# specify which fork to use. set this in our .env
# if we want to test multiple forks in one go, remove this as an argument below
#FORK_URL := ${ETH_RPC_URL} # BASE_RPC_URL, ETH_RPC_URL, ARBITRUM_RPC_URL

FORK_URL := ${RPC_URL}

# if we want to run only matching tests, set that here
test := test_

# PixelCanvas deployments
deploy-canvas :; forge script script/DeployPixelCanvas.s.sol --fork-url ${FORK_URL} --broadcast --private-key ${PRIVATE_KEY}
