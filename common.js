
const TeamFlags = {
	// No teams
	None:       0x00,
	// Players can choose their own team
	FreeForAll: 0x01,
	// All players must be in a team
	Required:   0x02,
	// Players cannot change teams during play
	Locked:     0x10
};

module.exports = {
	TeamFlags
};