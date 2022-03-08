package com.elementarysoftware.vdcb.tree;

import java.util.Date;

import io.iohk.atala.prism.protos.models.LedgerData;

public class PrismTimestampTreeObject {

	private LedgerData data;
	private int type;

	public static int TYPE_ADDED = 0;
	public static int TYPE_REVOKED = 1;

	public PrismTimestampTreeObject(LedgerData ledgerData, int t) {
		data = ledgerData;
		type = t;
	}

	public String getText() {
		return new Date(data.getTimestampInfo().getAtalaBlockTimestamp()).toLocaleString();
	}

	public int getType() {
		return type;
	}


}
