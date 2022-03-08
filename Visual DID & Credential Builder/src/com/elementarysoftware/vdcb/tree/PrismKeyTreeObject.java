package com.elementarysoftware.vdcb.tree;

import io.iohk.atala.prism.identity.PrismKeyInformation;
import io.iohk.atala.prism.protos.models.LedgerData;


public class PrismKeyTreeObject {
	
	private String name;
	private int type;
	private PrismKeyInformation info;
	
	public PrismKeyTreeObject(PrismKeyInformation keyInfo) {
		
		name = keyInfo.getKeyId();
		type = keyInfo.getKeyTypeEnum();
		info = keyInfo;
		System.out.println("PrismKeyTreeObject(name="+name+",type="+type+")");
	}

	public String getName() {
		return name;
	}

	public int getType() {
		return type;
	}
	
	public LedgerData getAddedOn() {
		return info.getAddedOn();
	}
	
	public LedgerData getRevokedOn() {
		return info.getRevokedOn();
	}
	
}
